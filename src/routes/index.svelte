<script>
	import { env } from '$env/dynamic/public';
	//import dotenv from 'dotenv';
	//dotenv.config();

	let points = 327;
	let stats = {
		basic: {
			"Strength": 0,
			"Fortitude": 0,
			"Agility": 0,
			"Intelligence": 0,
			"Willpower": 0,
			"Charisma": 0,
		},
		weapon: {
			"Light Wep.": 0,
			"Medium Wep." : 0,
			"Heavy Wep." : 0
		},
		elem: {
			"Flamecharm": 0,
			"Frostdraw": 0,
			"Galebreath": 0,
			"Thundercall": 0,
			"Shadowcast": 0
		}
	}
	//
	let categoryBlacklist = [
		"Innate",
		"Murmur",
		"Sovereign of Slaughter",
		"Angler",
		"Shipwright",
		"Deepwoken"
	]
	let talentBlacklist = [
		"Termite", "Blinded", "Mark of the Lone Warrior"
	]
	//
	let obtainables = {
		Legendary: {},
		Common: {},
		Rare: {}
	}
	function updateStats(ev) {
		let statName = ev.target.getAttribute("statName");
		let statType = ev.target.getAttribute("statType");
		if (ev.target.value >= 100) {
			ev.target.value = 100
		} else if (ev.target.value <= 0) {
			ev.target.value = 0;
		}
		// Failsafe
		if (points - ev.target.value < 0) {
			ev.target.value = points;
		}
		stats[statType][statName] = parseInt(ev.target.value);
		// Calculate points to deduct
		let investmentPoints = 327;
		let totalPoints = 0;
		for (let statType in stats) {
			for (let stat in stats[statType]) {
				totalPoints += stats[statType][stat];
			}
		}
		// Adding a point to investment points if player unlocked more elements
		let unlocked = false;;
		for (let stat in stats.elem) {
			if (unlocked && stats.elem[stat] > 0) {investmentPoints++};
			if (stats.elem[stat] >= 1) {unlocked = true};
		}
		// Apply deduction from investment points
		points = investmentPoints - totalPoints;
		// Filter out talents
		talentsCount = 0;
		obtainables = {
			Legendary: {},
			Common: {},
			Rare: {}
		}
		talents.map((talent) => {
			// Check for reqs
			//console.log(`Checking ${talent.name}`)
			if (talent.reqs != "None") {
				//console.log("Not none. Continuing...")
				for (let req in talent.reqs) {
					//console.log(talent)
					//console.log(`Checking ${req}`)
					for (let statType in stats) {
						if (stats[statType][req] == undefined) {
							//console.log(`${req} not found in ${statType}, continuing.`)
							continue;
						} else if (Number(stats[statType][req]) < talent.reqs[req]) {
							//console.log(`Checking req ${talent.reqs[req]} against stat ${stats[statType][req]}`)
							//console.log(`Not enough of ${talent.reqs[req]}. Skipping this talent.`)
							return;
						} else {
						}
					}
				}
			} else {
				//console.log(`Req is none! Adding...`)
			}
			//console.log(`Talent check passed. Adding to `)
			if (obtainables[talent.rarity][talent.category] == undefined) {
				obtainables[talent.rarity][talent.category] = [];
			}
			obtainables[talent.rarity][talent.category].push(talent);
			talentsCount++;
		})
	}
	function generate(text, avoid) {
		JSON.parse(text).forEach((card) => {
				if (card.name != avoid) {
					let [name, category] = card.name.split(" | ");
					// Remove blacklisted talents
					if (!categoryBlacklist.includes(category) && !name.includes("Unbounded") && !talentBlacklist.includes(name)) {
						let reqIndex = card.desc.indexOf("Requirements (if known):\n---\n");
						let [statReqs, addReq1, addReq2] = card.desc.slice(reqIndex + 29, card.desc.indexOf("Talent Stats")).split("\n")
						statReqs = statReqs.split(", ");
						let reqs = {};
						// Sanitize requirements
						let note = "";
						statReqs.map((req) => {
							if (!req.includes("https://")) {
								if (req == "None") {
									reqs = "None";
								} else {
									// Stat 
									let [amount, stat] = req.split(" ");
									if (stat == "Heavy") stat = "Heavy Wep.";
									if (stat == "Medium") stat = "Medium Wep.";
									if (stat == "Light") stat = "Light Wep.";
									amount == "Power" ? note += ` P${stat}` : reqs[stat] = amount;
								}
							} else {
								note += ` Talent Req.`
							}
						})
						// Checking for mantra / equipped reqs
						if (!addReq1 == "") {
							if (addReq1.includes("Mantra")) note += ` Mantra: ${addReq1.split(": ")[1]}`;
							if (addReq1.includes("Equipped")) note += ` ${addReq1.split(": ")[1]}`;
						}
						if (!addReq2 == "") {
							if (addReq2.includes("Mantra")) note += ` Mantra: ${addReq2.split(": ")[1]}`;
							if (addReq2.includes("Equipped")) note += ` ${addReq2.split(": ")[1]}`;
						}
						talents.push({
							name: name,
							category: category,
							rarity: avoid.split(" ")[0],
							reqs: reqs,
							note: note
						})
					}
				}
			});
	}
	// Fetching talents
	var auth = {};
	/*if (import.meta.env.DEV) {
		auth = {key: env.PUBLIC_TRELLO_API_KEY, token: env.PUBLIC_TRELLO_USER_TOKEN};
	} else {
		auth = {Key: process.env.PUBLIC_TRELLO_API_KEY, token: process.env.PUBLIC_TRELLO_USER_TOKEN};
	}*/
	auth = {key: env.PUBLIC_TRELLO_API_KEY, token: env.PUBLIC_TRELLO_USER_TOKEN};
	var categoryList = "62ae4f02bb2dc1611fec1d25";
	var lists = {
		"Legendary Talents": "62ad54ebea48c31bee197013",
		"Rare Talents": "62ad54ee5b99ba4f63ccb467",
		"Common Talents (Index A-D)": "62ad54f4c88e490f6670db7b",
		"Common Talents (Index E-L)": "62afe2bd39dfb612c3b63cec",
		"Common Talents (Index M-S)": "62afe2f6a2006e41efc383fd",
		"Common Talents (Index T-Misc.)": "62afe2ff1ff4a37fdee1369d"
	}
	var talents = [];
	var talentsCount = 0;
	// Generate caterogies
	/*fetch(`https://api.trello.com/1/lists/${categoryList}/cards?key=${auth.key}&token=${auth.token}`, {method: "GET"})
		.then(res => {return res.text()})
		.then(text => {JSON.parse(text).forEach((card) => {if (card.name != "Index") talents[card.name] = []})})
		.then(() => {*/
			// Loop through all the lists to generate 
			let fetches = []
			for (let listsName in lists) {
				fetches.push(
				fetch(`https://api.trello.com/1/lists/${lists[listsName]}/cards?key=${auth.key}&token=${auth.token}`, {method: "GET"})
					.then(res => {return res.text()})
					.then(text => {generate(text, listsName)})
					//.then(console.log(talents))
					.catch(err => console.error(err))
				)
			}
		/*})*/
</script>

<style>
	body {
		padding: 10px;
		background: url(/background.png) repeat;
		overflow: hidden;
	}
	.wrapper {
		border: 15px solid black;
		border-image: url(/border.png) 45%;
		background-color: #E5E0CA;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		font-size: 15px;
		color: black;
	}
	.stat-wrapper {
		width: 45%;
		font-weight: 600;
		height: 30vh;
	}
	.stats {
		display: flex;
	}
	.stat {
		width: 30%;
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		/*border-image: url(./border.png) 45%;*/
		margin: 2%;
	}
	.stat-item {
		position: relative;
		margin: 3px
	}
	.stat-input {
		float: right;
		width: 25%;
		right: 0;
	}
	#elemStats {
		border: none;
	}
	/* Talents */
	.talents-wrapper {
		margin-top: 25px;
		width: 45%;
		height: 50vh;
	}
	.talents-categories {
		display: flex;
		height: 95%;
	}
	.talents-category {
		text-align: center;
		width: 33%;
	}
	#rare {
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		border-left: 1px solid rgba(0, 0, 0, 0.5);
	}
	.talents {
		text-align: left;
		height: 90%;
		overflow-y: scroll;
		overflow-x: hidden;
	}
	fieldset { 
		border: none;
		border-top: 1px solid rgba(0, 0, 0, 0.5);
		color:rgba(0, 0, 0, 0.5);
		padding: 0px 0px 0px 15px;
	}
	.name {
		padding: 1px 5px;
	}
	.note {
		color: rgba(0, 0, 0, 0.25);

	}
</style>

<body>
	<div class="wrapper stat-wrapper">
		<h3 style="text-align: center; margin: 0"> Stats </h3>
		<div class="stats">
			<div id="basicStats" class="stat">
				{#each Object.entries(stats.basic) as [statName, statValue]}
					<div class="stat-item"> 
						{statName} <input {statName} statType="basic" type="number" class="stat-input" on:change={updateStats}>
					</div>
				{/each}
			</div>
			<div id="weaponStats" class="stat">
				{#each Object.entries(stats.weapon) as [statName, statValue]}
					<div class="stat-item"> 
						{statName} <input {statName} statType="weapon" type="number" class="stat-input" on:change={updateStats}>
					</div>
				{/each}
			</div>
			<div id="elemStats" class="stat">
				{#each Object.entries(stats.elem) as [statName, statValue]}
					<div class="stat-item"> 
						{statName} <input {statName} statType="elem" type="number" class="stat-input" on:change={updateStats}>
					</div>
				{/each}
			</div>
		</div>
		<p style="text-align:center; margin: 0">Investment Points: <b>{points}</b></p>
	</div>
	<!-- Talents -->
	<div class="wrapper talents-wrapper">
		<h3 style="text-align: center; margin: 0"> Talents <i class="note">{talentsCount}</i></h3>
		<div class="talents-categories">
			<div class="talents-category">
				Legendary
				<div class="talents">
					{#each Object.entries(obtainables.Legendary) as [category, talents]}
						<fieldset>
							<legend><i>{category}</i></legend>
						</fieldset>
						{#each talents as talent}
							<div class="name">
								<span>{talent.name}<i class="note">{talent.note}</i><br></span>
							</div>
						{/each}
					{:else}
						<br />
					{/each}
				</div>
			</div>
			<div class="talents-category" id="rare">
				Rare
				<div class="talents">
					{#each Object.entries(obtainables.Rare) as [category, talents]}
						<fieldset>
							<legend><i>{category}</i></legend>
						</fieldset>
						{#each talents as talent}
							<div class="name">
								<span>{talent.name}<i class="note">{talent.note}</i><br></span>
							</div>
						{/each}

					{:else}
						<br />
					{/each}
				</div>
			</div>
			<div class="talents-category">
				Common
				<div class="talents">
					{#each Object.entries(obtainables.Common) as [category, talents]}
						<fieldset>
							<legend><i>{category}</i></legend>
						</fieldset>
						{#each talents as talent}
							<div class="name">
								<span>{talent.name}<i class="note">{talent.note}</i><br></span>
							</div>
						{/each}
					{:else}
						<br />
					{/each}
				</div>
			</div>
		</div>
	</div>
</body>