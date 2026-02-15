"""Game simulation and disaster logic."""

import asyncio
import json
import random
from config import GAME_CONFIG, disaster_queue
from llm import call_llm, extract_json, gather_votes


async def process_disaster(disaster_text: str, state: dict, manager):
    """
    Evaluates a natural language disaster and applies it to state.

    Args:
        disaster_text: Natural language description of the disaster
        state: Current game state
        manager: ConnectionManager instance for broadcasting
    """
    alive_agents = [aid for aid, data in state["agents"].items()
                    if data["alive"]]

    prompt = f"""
    You are a Game Engine. The user invoked a disaster: "{disaster_text}".
    Current State:
    - Wild Fish in Ocean: {state['wild_fish']}
    - Village Stash (Food): {state['village_stash']}
    - Living Agents: {alive_agents}

    Interpret the disaster. Be creative but consequential.
    You must decide:
    1. How many wild fish die (fish_loss).
    2. How much stash is destroyed (stash_loss).
    3. Which specific agents die (kill_list).
    4. A flavor text description (flavor).

    OUTPUT JSON ONLY:
    {{
      "fish_loss": 10,
      "stash_loss": 5,
      "kill_list": ["Anne"],
      "flavor": "A rogue wave washed Anne away and spoiled the food!"
    }}
    """

    raw = await call_llm(prompt)
    data = extract_json(raw)

    fish_loss = int(data.get("fish_loss", 0))
    stash_loss = int(data.get("stash_loss", 0))
    kill_list = data.get("kill_list", [])
    flavor = data.get("flavor", f"Disaster struck: {disaster_text}")

    # Apply Effects
    state['wild_fish'] = max(0, state['wild_fish'] - fish_loss)
    state['village_stash'] = max(0, state['village_stash'] - stash_loss)

    killed_names = []
    for name in kill_list:
        if name in state['agents'] and state['agents'][name]['alive']:
            state['agents'][name]['alive'] = False
            killed_names.append(name)
            await manager.broadcast({"type": "DIE", "id": name})

    # Send Logs
    log_msg = f"{flavor} (Lost: {fish_loss} wild fish, {stash_loss} stash)"
    if killed_names:
        log_msg += f" Casualties: {', '.join(killed_names)}"

    await manager.broadcast({"type": "DISASTER_HIT", "text": log_msg})
    await manager.broadcast({"type": "UPDATE_STATS",
                             "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash']})


async def run_simulation(manager):
    """
    Main game simulation loop.

    Args:
        manager: ConnectionManager instance for broadcasting
    """
    try:
        await manager.broadcast({"type": "LOG", "text": "=== SIMULATION STARTED ==="})

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

        await manager.broadcast({"type": "INIT", "agent_ids": initial_agents})
        await manager.broadcast({"type": "UPDATE_STATS", "day": 0,
                                 "wild": state['wild_fish'], "stash": state['village_stash']})

        while state["day"] < state["max_days"] and not state["game_over"]:
            # Yield control to allow interrupts
            await asyncio.sleep(0)
            state["day"] += 1

            # Check for disasters at start of day
            if not disaster_queue.empty():
                d_text = await disaster_queue.get()
                await process_disaster(d_text, state, manager)

            await manager.broadcast({"type": "PHASE", "text": f"DAY {state['day']}"})

            # Natural Growth
            growth = int(state["wild_fish"] * GAME_CONFIG["FISH_GROWTH_RATE"])
            state["wild_fish"] += growth
            await manager.broadcast(
                {"type": "LOG", "text": f"[NATURE] Fish grew by {growth}."})
            await manager.broadcast(
                {"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash']})

            alive_agents = [aid for aid,
                            data in state["agents"].items() if data["alive"]]
            if not alive_agents:
                await manager.broadcast(
                    {"type": "PHASE", "text": "GAME OVER: EXTINCTION"})
                return

            if leader_id not in alive_agents:
                if alive_agents:
                    leader_id = alive_agents[0]
                    await manager.broadcast(
                        {"type": "LOG", "text": f"New Leader: {leader_id}"})
                else:
                    return  # Everyone died

            await manager.broadcast({"type": "SET_LEADER", "id": leader_id})

            # Check disaster again before planning
            if not disaster_queue.empty():
                d_text = await disaster_queue.get()
                await process_disaster(d_text, state, manager)
                # Re-check alive agents
                alive_agents = [aid for aid,
                                data in state["agents"].items() if data["alive"]]
                if not alive_agents:
                    return

            # -------------------------------------------------------
            # PHASE 1: FISHING PLAN
            # -------------------------------------------------------
            await manager.broadcast({"type": "PHASE", "text": "PHASE: Fishing Plan"})
            fishing_team = []
            fishing_passed = False

            agent_data_str = json.dumps(
                {k: v['skill'] for k, v in state['agents'].items() if v['alive']})

            leader_prompt = f"""
            You are {leader_id}, LEADER. Day {state['day']}. Wild Fish: {state['wild_fish']}. Stash: {state['village_stash']}.
            Agents: {agent_data_str}
            Goal: Pick fishing team. Wild fish population grows 25% daily. If wild fish hits 0, game over.
            OUTPUT JSON: {{ "say": "dialogue", "justification": "reason", "team": ["A"] }}
            """
            prop_data = extract_json(await call_llm(leader_prompt))
            proposed_team = [m for m in prop_data.get(
                "team", []) if m in alive_agents]
            leader_say = prop_data.get("say", f"Team {proposed_team}?")

            await manager.broadcast(
                {"type": "SPEECH", "id": leader_id, "text": leader_say})

            # Check disaster during voting
            if not disaster_queue.empty():
                await process_disaster(await disaster_queue.get(), state, manager)
                alive_agents = [aid for aid,
                                data in state["agents"].items() if data["alive"]]

            # --- FISHING VOTE ---
            non_leader_voters = [a for a in alive_agents if a != leader_id]

            def make_fishing_prompt(voter):
                return f"""
                You are {voter}. Leader proposes {proposed_team}.
                Reason: {prop_data.get('justification', '')}.
                Agents: {agent_data_str}.
                OUTPUT JSON: {{ "vote": "YES/NO", "say": "short dialogue" }}
                """

            vote_results = await gather_votes(non_leader_voters, make_fishing_prompt)

            votes_yes, votes_no = 0, 0
            for voter, (vote, _, say) in vote_results.items():
                await manager.broadcast({"type": "SPEECH", "id": voter, "text": say})
                if vote == "YES":
                    votes_yes += 1
                else:
                    votes_no += 1

            if votes_yes >= votes_no:
                fishing_team = proposed_team
                fishing_passed = True
                await manager.broadcast({"type": "LOG", "text": "Plan Approved"})
            else:
                await manager.broadcast({"type": "LOG", "text": "Plan Rejected"})

            # --- EXECUTE FISHING ---
            if fishing_passed:
                await manager.broadcast({"type": "PHASE", "text": "PHASE: Fishing"})
                # Check disaster before moving
                if not disaster_queue.empty():
                    await process_disaster(await disaster_queue.get(), state, manager)
                    fishing_team = [
                        m for m in fishing_team if state["agents"][m]["alive"]]

                await manager.broadcast(
                    {"type": "MOVE", "ids": fishing_team, "loc": "water"})

                total_catch = 0
                for fisher in fishing_team:
                    catch = 0
                    if state["wild_fish"] > 0:
                        catch = min(state["agents"][fisher]
                                    ["skill"], state["wild_fish"])

                    state["wild_fish"] -= catch
                    state["village_stash"] += catch
                    total_catch += catch

                    await manager.broadcast(
                        {"type": "SHOW_STATUS", "id": fisher, "text": f"Caught {catch}"})
                    await manager.broadcast(
                        {"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash']})

                await manager.broadcast(
                    {"type": "SPEECH", "id": fishing_team[0] if fishing_team else leader_id, "text": f"We caught {total_catch}!"})
                await manager.broadcast(
                    {"type": "MOVE", "ids": fishing_team, "loc": "home"})

            # -------------------------------------------------------
            # PHASE 2: REPRODUCTION
            # -------------------------------------------------------
            await manager.broadcast({"type": "PHASE", "text": "PHASE: Reproduction"})

            # Check disaster before repro
            if not disaster_queue.empty():
                await process_disaster(await disaster_queue.get(), state, manager)
                alive_agents = [aid for aid,
                                data in state["agents"].items() if data["alive"]]

            used_names = set(state["agents"].keys())
            available_names = [
                n for n in GAME_CONFIG["AGENT_NAMES"] if n not in used_names]
            candidate_name = random.choice(
                available_names) if available_names else None

            if candidate_name and alive_agents:
                candidate_skill = random.randint(*GAME_CONFIG["AGENT_SKILL_RANGE"])

                repro_leader_prompt = f"""
                You are {leader_id}, leader. Day {state["day"]}. Wild Fish: {state["wild_fish"]}. Stash: {state["village_stash"]}.
                Consider new member {candidate_name} (skill {candidate_skill}).
                Decide YES or NO.
                OUTPUT JSON: {{ "vote": "YES/NO", "say": "1 sentence", "justification": "reason" }}
                """
                repro_leader_data = extract_json(await call_llm(repro_leader_prompt))
                leader_repro_vote = repro_leader_data.get("vote", "NO").upper()
                leader_repro_say = repro_leader_data.get(
                    "say", f"I say {leader_repro_vote} on {candidate_name}.")

                await manager.broadcast(
                    {"type": "SPEECH", "id": leader_id, "text": leader_repro_say})

                non_leader_voters = [a for a in alive_agents if a != leader_id]

                def make_repro_prompt(voter):
                    return f"""
                    You are {voter}. Deciding on {candidate_name} (skill {candidate_skill}).
                    Leader says: {leader_repro_say}
                    Stash: {state["village_stash"]}.
                    OUTPUT JSON: {{ "vote": "YES/NO", "say": "1 sentence" }}
                    """

                repro_vote_results = await gather_votes(
                    non_leader_voters, make_repro_prompt)

                repro_yes, repro_no = (
                    1, 0) if leader_repro_vote == "YES" else (0, 1)
                for voter, (vote, _, say) in repro_vote_results.items():
                    await manager.broadcast({"type": "SPEECH", "id": voter, "text": say})
                    if vote == "YES":
                        repro_yes += 1
                    else:
                        repro_no += 1

                if repro_yes > repro_no:
                    state["agents"][candidate_name] = {
                        "id": candidate_name, "skill": candidate_skill, "alive": True}
                    await manager.broadcast(
                        {"type": "LOG", "text": f"Reproduction Approved: {candidate_name} joins!"})
                    await manager.broadcast(
                        {"type": "BORN", "id": candidate_name, "skill": candidate_skill})

                    arrival_prompt = f"""
                    You are {candidate_name}, new to village. Stash: {state["village_stash"]}.
                    OUTPUT JSON: {{ "say": "1 sentence intro" }}
                    """
                    arrival_data = extract_json(await call_llm(arrival_prompt))
                    await manager.broadcast(
                        {"type": "SPEECH", "id": candidate_name, "text": arrival_data.get("say", "Hi.")})

                    alive_agents = [
                        aid for aid, data in state["agents"].items() if data["alive"]]

            # -------------------------------------------------------
            # PHASE 3: RATIONING
            # -------------------------------------------------------
            await manager.broadcast({"type": "PHASE", "text": "PHASE: Rationing"})

            # Check disaster before rationing
            if not disaster_queue.empty():
                await process_disaster(await disaster_queue.get(), state, manager)
                alive_agents = [aid for aid,
                                data in state["agents"].items() if data["alive"]]
                if not alive_agents:
                    return

            dist_passed = False
            dist_plan = {}
            needs = {a: 1 for a in alive_agents}

            l_prompt = f"""
            You are {leader_id}. Stash: {state['village_stash']}. Needs: {json.dumps(needs)}.
            Goal: Distribute food. If < needs, death.
            OUTPUT JSON: {{ "say": "dialogue", "distribution": {{ "A": 1 }} }}
            """
            d_data = extract_json(await call_llm(l_prompt))
            dist_plan = d_data.get("distribution", {})

            for a in alive_agents:
                if a not in dist_plan:
                    dist_plan[a] = 0

            await manager.broadcast({"type": "SPEECH", "id": leader_id,
                                     "text": d_data.get("say", "Here is food.")})

            if sum(dist_plan.values()) > state["village_stash"]:
                await manager.broadcast(
                    {"type": "LOG", "text": "Invalid: Not enough food."})
            else:
                # --- RATIONING VOTE ---
                non_leader_voters = [a for a in alive_agents if a != leader_id]

                def make_rationing_prompt(voter):
                    return f"""
                    You are {voter}. You need 1. You get {dist_plan.get(voter, 0)}.
                    OUTPUT JSON: {{ "vote": "YES/NO", "say": "dialogue" }}
                    """

                vote_results = await gather_votes(
                    non_leader_voters, make_rationing_prompt)

                votes_yes, votes_no = 0, 0
                for voter, (vote, _, say) in vote_results.items():
                    await manager.broadcast({"type": "SPEECH", "id": voter, "text": say})
                    if vote == "YES":
                        votes_yes += 1
                    else:
                        votes_no += 1

                if votes_yes >= votes_no:
                    dist_passed = True
                    await manager.broadcast({"type": "LOG", "text": "Rations Approved"})
                else:
                    await manager.broadcast({"type": "LOG", "text": "Rations Rejected"})

            # --- EAT ---
            if dist_passed:
                total_eaten = 0
                for a in alive_agents:
                    got = dist_plan.get(a, 0)
                    await manager.broadcast(
                        {"type": "SHOW_STATUS", "id": a, "text": f"Ate {got}"})

                    if got < 1:
                        state["agents"][a]["alive"] = False
                        await manager.broadcast({"type": "DIE", "id": a})
                        await manager.broadcast(
                            {"type": "SPEECH", "id": a, "text": "I'm starving..."})
                    else:
                        await manager.broadcast(
                            {"type": "SPEECH", "id": a, "text": "Yum."})

                    total_eaten += got

                state["village_stash"] -= total_eaten
            else:
                await manager.broadcast(
                    {"type": "LOG", "text": "DEADLOCK. Nobody eats."})

            await manager.broadcast(
                {"type": "UPDATE_STATS", "day": state["day"], "wild": state['wild_fish'], "stash": state['village_stash']})

        await manager.broadcast({"type": "PHASE", "text": "SIMULATION ENDED"})

    except asyncio.CancelledError:
        await manager.broadcast({"type": "LOG", "text": "Simulation interrupted"})
        raise
    except Exception as e:
        await manager.broadcast({"type": "LOG", "text": f"Simulation error: {e}"})
        raise
