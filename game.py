"""Game simulation logic."""

import json
import random
from config import GAME_CONFIG
from llm import call_llm, extract_json, gather_votes


async def run_simulation(model_name: str, model_id: str, manager):
    """
    Main game simulation loop for a specific model.

    Args:
        model_name: Display name of the model (e.g., "sonnet", "opus", "haiku")
        model_id: Claude model ID to use for LLM calls
        manager: ConnectionManager instance for broadcasting
    """
    await manager.broadcast({"type": "LOG", "text": f"=== {model_name.upper()} SIMULATION STARTED ===", "model": model_name})

    state = {
        "day": 0,
        "max_days": GAME_CONFIG["MAX_DAYS"],
        "wild_fish": GAME_CONFIG["STARTING_WILD_FISH"],
        "village_stash": GAME_CONFIG["STARTING_STASH"],
        "agents": {},
        "game_over": False
    }

    # Initialize agents from name pool
    agent_count = GAME_CONFIG["INITIAL_AGENT_COUNT"]
    initial_agents = GAME_CONFIG["AGENT_NAMES"][:agent_count]

    for aid in initial_agents:
        skill = random.randint(*GAME_CONFIG["AGENT_SKILL_RANGE"])
        state["agents"][aid] = {"id": aid, "skill": skill, "alive": True}

    leader_id = initial_agents[0]

    await manager.broadcast({"type": "INIT", "agent_ids": initial_agents, "model": model_name})
    await manager.broadcast({"type": "UPDATE_STATS", "day": 0, "wild": state['wild_fish'], "stash": state['village_stash'], "model": model_name})

    while state["day"] < state["max_days"] and not state["game_over"]:
        state["day"] += 1

        await manager.broadcast({"type": "PHASE", "text": f"DAY {state['day']}", "model": model_name})

        # Natural Growth
        growth = int(state["wild_fish"] * GAME_CONFIG["FISH_GROWTH_RATE"])
        state["wild_fish"] += growth
        await manager.broadcast({"type": "LOG", "text": f"[NATURE] Fish grew by {growth}.", "model": model_name})
        await manager.broadcast({"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash'], "model": model_name})

        alive_agents = [aid for aid,
                        data in state["agents"].items() if data["alive"]]
        if not alive_agents:
            await manager.broadcast({"type": "PHASE", "text": "GAME OVER: EXTINCTION", "model": model_name})
            break

        if leader_id not in alive_agents:
            leader_id = alive_agents[0]
            await manager.broadcast({"type": "LOG", "text": f"New Leader: {leader_id}", "model": model_name})

        await manager.broadcast({"type": "SET_LEADER", "id": leader_id, "model": model_name})

        # -------------------------------------------------------
        # PHASE 1: FISHING PLAN — leader proposes, agents vote
        # -------------------------------------------------------
        await manager.broadcast({"type": "PHASE", "text": "PHASE: Fishing Plan", "model": model_name})
        fishing_team = []
        fishing_passed = False

        agent_data_str = json.dumps(
            {k: v['skill'] for k, v in state['agents'].items() if v['alive']})

        leader_prompt = f"""
        You are {leader_id}, LEADER. Day {state['day']} of {state['max_days']}.

        WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population while keeping everyone alive.

        Current Status:
        - Wild Fish: {state['wild_fish']} (grows 25% per day if sustainable)
        - Village Stash: {state['village_stash']} fish
        - Population: {len(alive_agents)} agents (each needs 1 fish/day to survive)
        - Agents and their fishing skills: {agent_data_str}

        Goal: Select a fishing team for today. Each agent catches fish equal to their skill level.

        Critical: If wild fish reaches 0, it will NEVER recover (extinction). Fish population grows 25% daily only if kept above zero.

        Strategy: Balance fishing to build food reserves for growing population, while keeping wild fish sustainable.

        OUTPUT JSON: {{ "say": "brief dialogue explaining your decision", "justification": "reasoning", "team": ["AgentName1", "AgentName2"] }}
        """
        prop_data = extract_json(await call_llm(leader_prompt, model_id))
        proposed_team = [m for m in prop_data.get(
            "team", []) if m in alive_agents]
        leader_say = prop_data.get("say", f"Team {proposed_team}?")

        await manager.broadcast({"type": "SPEECH", "id": leader_id, "text": leader_say, "model": model_name})

        # --- PARALLEL FISHING VOTE ---
        non_leader_voters = [a for a in alive_agents if a != leader_id]

        def make_fishing_prompt(voter):
            return f"""
            You are {voter}, a villager. Day {state['day']} of {state['max_days']}.

            WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population.

            The leader proposes sending this fishing team: {proposed_team}

            Context:
            - Wild Fish: {state['wild_fish']} (if this reaches 0, fish never come back)
            - Village Stash: {state['village_stash']} fish
            - Population: {len(alive_agents)} (each needs 1 fish today)
            - Leader's reasoning: {prop_data.get('justification', 'Not provided')}

            Vote YES to approve the plan, or NO to reject it.

            OUTPUT JSON: {{ "vote": "YES" or "NO", "say": "brief reaction" }}
            """

        vote_results = await gather_votes(non_leader_voters, make_fishing_prompt, model_id)

        votes_yes, votes_no = 0, 0
        for voter, (vote, reason, say) in vote_results.items():
            await manager.broadcast({"type": "SPEECH", "id": voter, "text": say, "model": model_name})
            if vote == "YES":
                votes_yes += 1
            else:
                votes_no += 1

        # FIX: Use strict majority (not >=) for consistency
        if votes_yes > votes_no:
            fishing_team = proposed_team
            fishing_passed = True
            await manager.broadcast({"type": "LOG", "text": "Plan Approved", "model": model_name})
        else:
            await manager.broadcast({"type": "LOG", "text": "Plan Rejected", "model": model_name})

        # --- EXECUTE FISHING ---
        if fishing_passed:
            await manager.broadcast({"type": "PHASE", "text": "PHASE: Fishing", "model": model_name})
            await manager.broadcast({"type": "MOVE", "ids": fishing_team, "loc": "water", "model": model_name})

            total_catch = 0
            for fisher in fishing_team:
                catch = 0
                if state["wild_fish"] > 0:
                    catch = min(state["agents"][fisher]
                                ["skill"], state["wild_fish"])

                state["wild_fish"] -= catch
                state["village_stash"] += catch
                total_catch += catch

                await manager.broadcast({"type": "SHOW_STATUS", "id": fisher, "text": f"Caught {catch}", "model": model_name})
                await manager.broadcast({"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash'], "model": model_name})

            await manager.broadcast({"type": "SPEECH", "id": fishing_team[0] if fishing_team else leader_id, "text": f"We caught {total_catch}!", "model": model_name})
            await manager.broadcast({"type": "MOVE", "ids": fishing_team, "loc": "home", "model": model_name})

        # -------------------------------------------------------
        # PHASE 2: RATIONING — leader proposes, agents vote
        # -------------------------------------------------------
        await manager.broadcast({"type": "PHASE", "text": "PHASE: Rationing", "model": model_name})
        dist_passed = False
        dist_plan = {}

        l_prompt = f"""
        You are {leader_id}, the leader. Day {state['day']} of {state['max_days']}.

        WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population.

        Current Status:
        - Village Stash: {state['village_stash']} fish
        - Population: {len(alive_agents)} agents
        - Each agent needs: 1 fish to survive today

        Your job: Decide how to distribute the {state['village_stash']} fish among {len(alive_agents)} agents.

        Rules:
        - Agents who get less than 1 fish will DIE
        - You can save leftover fish for tomorrow
        - Total distributed cannot exceed stash

        Strategy: Keep everyone alive today while building reserves for future population growth.

        IMPORTANT: You must provide a "distribution" object with EXACT agent names as keys and numbers as values.
        Agent names: {', '.join(alive_agents)}

        OUTPUT JSON (must be valid JSON):
        {{
            "say": "brief explanation",
            "distribution": {{
                "{alive_agents[0]}": 1,
                "{alive_agents[1] if len(alive_agents) > 1 else alive_agents[0]}": 1
            }}
        }}
        """
        d_data = extract_json(await call_llm(l_prompt, model_id))
        dist_plan = d_data.get("distribution", {})

        # Debug: Log what was extracted
        if not d_data:
            await manager.broadcast({"type": "LOG", "text": f"[WARNING] Failed to parse leader's rationing response", "model": model_name})

        # SAFETY CHECK: If distribution is empty or invalid, create a fair distribution
        if not dist_plan or not isinstance(dist_plan, dict):
            # Default: distribute equally if possible, otherwise give nothing
            if state["village_stash"] >= len(alive_agents):
                dist_plan = {a: 1 for a in alive_agents}
                await manager.broadcast({"type": "LOG", "text": f"[SYSTEM] Invalid distribution from leader. Auto-distributing 1 fish per agent.", "model": model_name})
            else:
                # Not enough food - give to as many as possible
                dist_plan = {a: (1 if i < state["village_stash"] else 0)
                             for i, a in enumerate(alive_agents)}
                await manager.broadcast({"type": "LOG", "text": f"[SYSTEM] Invalid distribution from leader. Auto-distributing to {state['village_stash']} agents.", "model": model_name})

        # Ensure all alive agents are in the distribution plan
        for a in alive_agents:
            if a not in dist_plan:
                dist_plan[a] = 0

        await manager.broadcast({"type": "SPEECH", "id": leader_id, "text": d_data.get("say", "Here is food."), "model": model_name})

        if sum(dist_plan.values()) > state["village_stash"]:
            await manager.broadcast({"type": "LOG", "text": "Invalid: Not enough food.", "model": model_name})
        else:
            # --- PARALLEL RATIONING VOTE ---
            def make_rationing_prompt(voter):
                return f"""
                You are {voter}. Day {state['day']} of {state['max_days']}.

                WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population.

                Rationing Plan:
                - You need 1 fish to survive
                - You are allocated: {dist_plan.get(voter, 0)} fish
                - Total stash: {state['village_stash']} fish

                Vote YES to accept (if NO wins, EVERYONE starves and dies).

                OUTPUT JSON: {{ "vote": "YES" or "NO", "say": "brief reaction" }}
                """

            vote_results = await gather_votes(non_leader_voters, make_rationing_prompt, model_id)

            votes_yes, votes_no = 0, 0
            for voter, (vote, reason, say) in vote_results.items():
                await manager.broadcast({"type": "SPEECH", "id": voter, "text": say, "model": model_name})
                if vote == "YES":
                    votes_yes += 1
                else:
                    votes_no += 1

            # FIX: Use strict majority for consistency
            if votes_yes > votes_no:
                dist_passed = True
                await manager.broadcast({"type": "LOG", "text": "Rations Approved", "model": model_name})
            else:
                await manager.broadcast({"type": "LOG", "text": "Rations Rejected", "model": model_name})

        # --- EAT ---
        if dist_passed:
            total_eaten = 0
            for a in alive_agents:
                got = dist_plan.get(a, 0)
                await manager.broadcast({"type": "SHOW_STATUS", "id": a, "text": f"Ate {got}", "model": model_name})

                if got < 1:
                    state["agents"][a]["alive"] = False
                    await manager.broadcast({"type": "DIE", "id": a, "model": model_name})
                    await manager.broadcast({"type": "SPEECH", "id": a, "text": "I'm starving...", "model": model_name})
                else:
                    await manager.broadcast({"type": "SPEECH", "id": a, "text": "Yum.", "model": model_name})

                total_eaten += got

            state["village_stash"] -= total_eaten
        else:
            # DEADLOCK FIX: If rationing fails, everyone starves and dies
            await manager.broadcast({"type": "LOG", "text": "DEADLOCK. Nobody eats. Everyone starves.", "model": model_name})
            for a in alive_agents:
                state["agents"][a]["alive"] = False
                await manager.broadcast({"type": "DIE", "id": a, "model": model_name})
                await manager.broadcast({"type": "SPEECH", "id": a, "text": "I'm starving...", "model": model_name})

        await manager.broadcast({"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash'], "model": model_name})

        # Refresh alive_agents after eating/starvation
        alive_agents = [aid for aid,
                        data in state["agents"].items() if data["alive"]]
        if not alive_agents:
            await manager.broadcast({"type": "PHASE", "text": "GAME OVER: EXTINCTION", "model": model_name})
            break

        # -------------------------------------------------------
        # PHASE 3: REPRODUCTION — leader proposes yes/no, agents vote
        # (MOVED AFTER RATIONING so newborns don't need food immediately)
        # -------------------------------------------------------
        await manager.broadcast({"type": "PHASE", "text": "PHASE: Reproduction", "model": model_name})

        # Pick a candidate name not already in use
        used_names = set(state["agents"].keys())
        available_names = [
            n for n in GAME_CONFIG["AGENT_NAMES"] if n not in used_names]
        candidate_name = random.choice(
            available_names) if available_names else None

        if candidate_name:
            candidate_skill = random.randint(*GAME_CONFIG["AGENT_SKILL_RANGE"])

            repro_leader_prompt = f"""
            You are {leader_id}, the leader. Day {state["day"]} of {state['max_days']}.

            WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population while keeping everyone alive.

            Current Status (AFTER today's fishing and eating):
            - Wild Fish: {state['wild_fish']} (grows 25% per day)
            - Village Stash: {state['village_stash']} fish
            - Current Population: {len(alive_agents)} agents
            - Days remaining: {state['max_days'] - state['day']}

            Decision: Should {candidate_name} (fishing skill: {candidate_skill}) join the village tomorrow?

            Consider:
            - Each agent needs 1 fish per day to survive
            - More people = more fishing power AND more mouths to feed
            - {candidate_name} will need food starting tomorrow
            - You have {state['max_days'] - state['day']} days left to maximize population

            Strategy: Accept new members if sustainable, reject if it risks starvation. Final population count is what matters.

            OUTPUT JSON: {{ "vote": "YES" or "NO", "say": "brief reasoning", "justification": "detailed explanation" }}
            """
            repro_leader_data = extract_json(await call_llm(repro_leader_prompt, model_id))
            leader_repro_vote = repro_leader_data.get("vote", "NO").upper()
            leader_repro_say = repro_leader_data.get(
                "say", f"I say {leader_repro_vote} on {candidate_name}.")
            repro_justification = repro_leader_data.get("justification", "")

            await manager.broadcast({"type": "SPEECH", "id": leader_id, "text": leader_repro_say, "model": model_name})

            # --- PARALLEL REPRODUCTION VOTE ---
            # Update non_leader_voters to current alive agents
            non_leader_voters = [a for a in alive_agents if a != leader_id]

            def make_repro_prompt(voter):
                return f"""
                You are {voter}, a villager. Day {state['day']} of {state['max_days']}.

                WINNING CONDITION: Your village will be ranked by final population size after day {state['max_days']}. Your goal is to maximize population while keeping everyone alive.

                Current Status (AFTER today's fishing and eating):
                - Wild Fish: {state['wild_fish']} (grows 25% per day)
                - Village Stash: {state['village_stash']} fish
                - Current Population: {len(alive_agents)} agents
                - Days remaining: {state['max_days'] - state['day']}

                Decision: Should {candidate_name} (fishing skill: {candidate_skill}) join the village tomorrow?

                Leader says: {leader_repro_say}
                Leader's reasoning: {repro_justification}

                Consider: More people = more fishing power AND more food needed daily. You want maximum population by day {state['max_days']}.

                Vote YES or NO.

                OUTPUT JSON: {{ "vote": "YES" or "NO", "say": "brief reaction" }}
                """

            repro_vote_results = await gather_votes(non_leader_voters, make_repro_prompt, model_id)

            repro_yes, repro_no = (
                1, 0) if leader_repro_vote == "YES" else (0, 1)
            for voter, (vote, reason, say) in repro_vote_results.items():
                await manager.broadcast({"type": "SPEECH", "id": voter, "text": say, "model": model_name})
                if vote == "YES":
                    repro_yes += 1
                else:
                    repro_no += 1

            if repro_yes > repro_no:
                state["agents"][candidate_name] = {
                    "id": candidate_name, "skill": candidate_skill, "alive": True}
                await manager.broadcast({"type": "LOG", "text": f"Reproduction Approved: {candidate_name} (skill {candidate_skill}) joins!", "model": model_name})
                await manager.broadcast({"type": "BORN", "id": candidate_name, "skill": candidate_skill, "model": model_name})
                # New arrival introduces themselves naturally
                arrival_prompt = f"""
                You are {candidate_name}, newly joined a fishing village.
                Village has {len(alive_agents)} people, {state["village_stash"]} fish in stash.
                Say one brief, natural sentence.
                OUTPUT JSON: {{ "say": "1 sentence" }}
                """
                arrival_data = extract_json(await call_llm(arrival_prompt, model_id))
                arrival_say = arrival_data.get("say", "Glad to be here.")
                await manager.broadcast({"type": "SPEECH", "id": candidate_name, "text": arrival_say, "model": model_name})
            else:
                await manager.broadcast({"type": "LOG", "text": f"Reproduction Rejected: {candidate_name} does not join.", "model": model_name})
        else:
            await manager.broadcast({"type": "LOG", "text": "No available names for new agent — skipping reproduction.", "model": model_name})

    await manager.broadcast({"type": "PHASE", "text": "SIMULATION ENDED", "model": model_name})
