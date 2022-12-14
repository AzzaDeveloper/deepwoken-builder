<script>
	import { env } from '$env/dynamic/public';
	import { page } from '$app/stores';
	import { tooltip } from "../lib/tooltip";
	//
	import { initializeApp, getApps, getApp} from "firebase/app"
	import { getFirestore, collection, doc, setDoc, getDoc, getDocs} from "firebase/firestore"
	import { firebaseConfig } from "../lib/firebaseConfig"
	//
	const firebaseApp = initializeApp(firebaseConfig);
 	const db = getFirestore(firebaseApp);
	//
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
	// Build info
	let obtainables = {
		talents: {
			Legendary: {},
			Rare: {},
			Common: {},
		},
		mantras: {}
	}
	let takenTalents = {};
	let takenTalentsCount = 0;
	//
	let buildInfo = {
		name: "",
		desc: "",
		oath: "",
		murmur: ""
	}
	let mantras = {Combat: [], Mobility: [], Support: []};
	//
	let oaths = ["Oathless", "Blindseer", "Visionshaper"];
	let murmurs = ["Ardour", "Tacet"];
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
	// Search bar
	let search = "";
	function updateSearch(ev) {
		search = ev.target.value;
		updateTalents();
	}
	// Function to make sure no more than 1 tooltips are seen at any point
	function checkTooltips() {
		let tooltips = document.querySelectorAll("[tooltip=\"true\"]");
		if (tooltips.length > 1) tooltips[0].remove();	
	}
	function removeTooltip() {
		let tooltips = document.querySelectorAll("[tooltip=\"true\"]");
		tooltips[0].remove();
	}
	//
	function updateTalents() {
		let tempObs = obtainables.talents;
		obtainables.talents = {
			Legendary: {},
			Rare: {},
			Common: {},
		}
		// Filter out talents
		talentsCount = 0;
		talents.map((talent) => {
			talent.new = true;
			// Check for reqs
			if (talent.reqs != "None") {
				if (!talent.multipleReqs) {
					for (let req in talent.reqs) {
						for (let statType in stats) {
							if (stats[statType][req] == undefined) {
								continue;
							} else if (Number(stats[statType][req]) < talent.reqs[req]) {
								return;
							}
						}
					}
				} else {
					let pass = false;
					for (let req in talent.reqs) {
						for (let statType in stats) {
							if (stats[statType][req] == undefined) {
								continue;
							} else if (Number(stats[statType][req]) >= talent.reqs[req]) {
								pass = true
							}
						}
					}
					if (!pass) return;
				}
			}
			// See if talent already exists
			for (let rarity in tempObs) {
				for (let category in tempObs[rarity]) {
					tempObs[rarity][category].map(oldTalent => {
						if (talent.name == oldTalent.name) {
							talent.new = false;
						}
					})
				}
			}
			// Search bar
			console.log(search);
			//console.log(`Talent check passed. Adding to `)
			if (talent.name.toLowerCase().includes(search)) {
				if (obtainables.talents[talent.rarity][talent.category] == undefined) obtainables.talents[talent.rarity][talent.category] = [];
				obtainables.talents[talent.rarity][talent.category].push(talent);
				talentsCount++;
			}		
			//
			updateTalentStats();
		})
	}
	//
	let talentStats = {};
	function getTalent(category, talent, taking) {
		if (takenTalents[category] == undefined) takenTalents[category] = [];
		let foundTalent = false; let talentIndex = 0;
		takenTalents[category].map((takenTalent, i) => {if (takenTalent.name == talent.name) {foundTalent = true; talentIndex = i}});
		if (taking) {
			if (!foundTalent) {
				takenTalents[category].push(talent);
				takenTalentsCount++;
			}
		} else {
			takenTalents[category].splice(talentIndex, 1)
			if (takenTalents[category].length == 0) {
				delete takenTalents[category];
			}
			takenTalentsCount--;
		}
		takenTalents = takenTalents;
		updateTalentStats();
		removeTooltip();
	}
	function updateTalentStats() {
		// Calculate stats
		talentStats = {};
		for (let category in takenTalents) {
			takenTalents[category].map(talent => {
				if (talent.stats != "None") {
				// add card stats together
					for (let stat in talent.stats) {
						if (talentStats[stat] == undefined) talentStats[stat] = 0;
						talentStats[stat] += talent.stats[stat];
					}
				}
			})
		}
	}
	function updateActualStats(noUpdateMantra) {
		// Calculate points to deduct
		let investmentPoints = 327;
		let totalPoints = 0;
		for (let statType in stats) {
			for (let stat in stats[statType]) {
				totalPoints += stats[statType][stat];
			}
		}
		// Adding a point to investment points if player unlocked more elements
		let unlocked = false;
		for (let stat in stats.elem) {
			if (unlocked && stats.elem[stat] > 0) {investmentPoints++};
			if (stats.elem[stat] >= 1) {unlocked = true};
		}
		// Apply deduction from investment points
		points = investmentPoints - totalPoints;
		updateTalents();
		if (!noUpdateMantra) updateMantras();
	}
	//
	function updateStats(ev) {
		let statName = ev.target.getAttribute("statName");
		let statType = ev.target.getAttribute("statType");
		if (statType == "basic") {
			if (ev.target.value >= 102) {
				ev.target.value = 102;
			} else if (ev.target.value <= 0) {
				ev.target.value = 0;
			}
		} else if (ev.target.value >= 100) {
			ev.target.value = 100;
		} else if (ev.target.value <= 0) {
			ev.target.value = 0;
		}
		// Failsafe
		var change = ev.target.value - stats[statType][statName];
		if (points - change < 0) {
			ev.target.value = ev.target.value - change;
		}
		stats[statType][statName] = parseInt(ev.target.value);
		updateActualStats();
	}
	// Talents
	let talents = [];
	let talentsCount = 0;
	function generate(text, avoid) {
		var parsedText = JSON.parse(text);		
		parsedText.forEach((card) => {
			let [name, category] = card.name.split(" | ");
			// Remove blacklisted talents
			if (!categoryBlacklist.includes(category) && !name.includes("Unbounded") && !talentBlacklist.includes(name) && !(name == avoid)) {
				// Getting reqs
				let reqIndex = card.desc.indexOf("Requirements (if known):\n---\n");
				let [statReqs, addReq1, addReq2] = card.desc.slice(reqIndex + 29, card.desc.indexOf("Talent Stats")).split("\n")
				let multipleReqs = false;
				if (statReqs.includes(" or ")) {
					multipleReqs = true;
					statReqs = statReqs.split(" or ");
				} else {
					statReqs = statReqs.split(", ");
				}
				let reqs = {};
				// Getting descs
				let desc = card.desc.slice(card.desc.indexOf("Talent Description:\n---\n") + 23, card.desc.indexOf("What It Does In-Game:"));
				let statText = card.desc.slice(card.desc.indexOf("Talent Stats:\n---\n") + 18, card.desc.indexOf("Talent Image") - 1);
				statText = statText.split(", ");
				let tStats = {};
				if (statText[0] == "--" || statText[0] == "") {
					tStats = "None";
				} else {
					statText.map(stat => {
						let amount = parseInt(stat.split(" ")[0].substring(1));
						let name = stat.split(" ")
						name.splice(0, 1);
						name = name.join(" ");
						tStats[name] = amount;
					})
				}
				//
				let note = "";
				let power = 0;
				let extraReqs = [];
				statReqs.map((req) => {
					//console.log(req);
					if (!req.includes("https://")) {
						if (req == "None") {
							reqs = "None";
						} else {
							// Stat 
							let [amount, stat] = req.split(" ");
							if (stat == "Heavy") stat = "Heavy Wep.";
							if (stat == "Medium") stat = "Medium Wep.";
							if (stat == "Light") stat = "Light Wep.";
							amount == "Power" ? power = stat : reqs[stat] = amount;
							if (power > 0) note += ` P${stat}`;
						}
					} else if (req.includes("https://")) {
						// Adding talent reqs
						note += ` Talent Req.`;
						let talentName = req.split(": ")[1];
						extraReqs.push({type: "Talent", content: talentName.split(" - ")[0]});
					}
				})
				// Checking for mantra / equipped reqs
				function checkReqs(req) {
					if (!req == "") {
						if (req.includes("Mantra")) {
							note += ` Mantra Req.`;
							extraReqs.push({type: "Mantra", content: req.split(": ")[1]});
						} else if (req.includes("Equipped")) {
							note += ` Equipped: ${req.split(": ")[1]}` 
							extraReqs.push({type: "Equipped", content: req.split(": ")[1]});
						} else if (req.includes("Lock")) {
							note += ` Locks`
							extraReqs.push({type: req.split(": ")[0], content: req.split(": ")[1]});
						} else if (req.includes("Oath")) {
							note += ` Oath`
							extraReqs.push({type: req.split(": ")[0], content: req.split(": ")[1]});
						}
					}
				}
				checkReqs(addReq1); checkReqs(addReq2);
				// Pushing talent into talents list
				let talent = {
					name: name,
					category: category,
					desc: desc,
					stats: tStats,
					rarity: avoid.split(" ")[0],
					reqs: reqs,
					extraReqs: extraReqs,
					multipleReqs: multipleReqs,
					power: power,
					taken: false,
					note: note,
					new: true,
				}
				talents.push(talent)
			}
		});
	}
	// Getting rollable mantras
	function generateMantras(text) {
		JSON.parse(text).forEach(card => {
			if (card.name == "Attunementless" || card.name == "Flamecharm" || card.name == "Frostdraw" || card.name == "Thundercall" || card.name == "Galebreath" || card.name == "Shadowcast" || card.name == "-------------------") {
				return;
			}
			console.log(card.name);
			//
			let [mantraName, mantraDetails] = card.name.split(" | ");
			let [attunement, type, stars] = mantraDetails.split(" ");
			if (attunement != "Attunementless") {
				if (stars == undefined) stars = "";
				mantras[type].push({
					name: mantraName,
					attunementless: false,
					reqs: {},
					type: attunement,
					stars: stars,
					taken: false
				})
			} else {
				let [__, stat, type] = mantraDetails.split(" ");
				let stars = mantraDetails[mantraDetails.indexOf("★")]; if (stars == undefined) stars = "";
				let reqs = mantraDetails.substring(mantraDetails.indexOf("(") + 1, mantraDetails.indexOf(")")).split(", ");
				let actualReqs = {};
				reqs.map(req => {actualReqs[req.split(" ")[1]] = req.split(" ")[0]});
				mantras[type].push({
					name: mantraName,
					attunementless: true,
					reqs: actualReqs,
					type: type,
					stars: stars,
					taken: false
				})
			}
		})
	}
	function updateMantras(data) {
		obtainables.mantras = {Combat: [], Mobility: [], Support: []}
		// Loop through elements to see which mantra is obtainable
		for (let mantraType in mantras) {
			mantras[mantraType].map(mantra => {
				if (!mantra.attunementless) {
					let stat = stats.elem[mantra.type];
					let stars = mantra.stars.length;
					if (stat >= 1 && stars == 0) obtainables.mantras[mantraType].push(mantra)
					if (stat >= 20 && stars == 1) obtainables.mantras[mantraType].push(mantra)
					if (stat >= 30 && stars == 2) obtainables.mantras[mantraType].push(mantra)
					if (stat >= 50 && stars == 3) obtainables.mantras[mantraType].push(mantra)
				} else {
					// Check reqs
					for (let req in mantra.reqs) {
						mantra.reqs[req] = parseInt(mantra.reqs[req]);
						let mantraReq = mantra.reqs[req];
						if (stats.basic[req] == undefined) {
							if (req == "Heavy") req = "Heavy Wep.";
							if (req == "Medium") req = "Medium Wep.";
							if (req == "Light") req = "Light Wep.";
							if (stats.weapon[req] < mantraReq) continue;
						} else {
							if (stats.basic[req] < mantraReq) continue;
						}
						obtainables.mantras[mantraType].push(mantra)
					}
				}
				// Data
				if (data != undefined) {
					if (data.indexOf(mantra.name) != -1) mantra.taken = true;
				}
			})
		}
	}
	function getMantra(elem, mantra, mantraType, intialTakenCheck) {
		if (intialTakenCheck) {
			if (mantra.taken) {
				return "color: black; font-weight: 700";
			}
		} else if (!mantra.taken) {
			elem.style.color = "black";
			elem.style.fontWeight = "700";
			mantra.taken = true;
		} else {
			elem.removeAttribute("style");
			mantra.taken = false;
		}
		obtainables.mantras[mantraType] = obtainables.mantras[mantraType];
	}
	// Fetching talents
	var auth = {};
	auth = {key: env.PUBLIC_TRELLO_API_KEY, token: env.PUBLIC_TRELLO_USER_TOKEN};
	var mantraList = "63236a2ae478db0156a9bf6d";
	var lists = {
		"Legendary Talents": "62ad54ebea48c31bee197013",
		"Rare Talents": "62ad54ee5b99ba4f63ccb467",
		"Common Talents (Index A-D)": "62ad54f4c88e490f6670db7b",
		"Common Talents (Index E-L)": "62afe2bd39dfb612c3b63cec",
		"Common Talents (Index M-S)": "62afe2f6a2006e41efc383fd",
		"Common Talents (Index T-Misc.)": "62afe2ff1ff4a37fdee1369d"
	}
	// Fetch cards
	fetch(`https://api.trello.com/1/boards/fRWhz9Ew/lists?key=${auth.key}&token=${auth.token}`, {method: "GET"})
			.then(res => {return res.text()})
			.then(text => {console.log(text)})
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
	// Mantra fetching
	fetches.push(
		fetch(`https://api.trello.com/1/lists/${mantraList}/cards?key=${auth.key}&token=${auth.token}`, {method: "GET"})
			.then(res => {return res.text()})
			.then(text => {generateMantras(text)})
			//.then(console.log(talents))
			.catch(err => console.error(err))
	)
	Promise.all(fetches).then(function() {
		// Generate intial talents
		updateTalents();
		// Load existing data if url has id
		if ($page.url.searchParams.has("id")) {
			let id = $page.url.searchParams.get("id");
			let docRef = doc(db, "builds", id);
			getDoc(docRef).then(docSnap => {
				if (docSnap.exists()) {
					let data = docSnap.data();
					buildInfo = data.buildInfo;
					//
					talents.map(talent => {
						if (data.taken.talents.indexOf(talent.name) != -1) {
							if (takenTalents[talent.category] == undefined) takenTalents[talent.category] = [];
							takenTalents[talent.category].push(talent);
						}
					})
					//
					for (let statType in stats) {
						for (let stat in stats[statType]) {
							stats[statType][stat] = data.stats[statType][stat];
						}
					}
					//
					for (let category in takenTalents) {
						takenTalentsCount += takenTalents[category].length;
					}
					//
					updateMantras(data.taken.mantras);
					updateActualStats(true);
					updateTalents();
					//
				} else {
					alert("No build found with requested ID!")
				}
			})
		}
  	});
	function makeId(length) {
		var result           = '';
		var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		var charactersLength = characters.length;
		for (let i = 0; i < length; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
		return result;
	}
	// Exporting
	function exportBuild() {
		console.log("attempting to export")
		// Basic validations and sanitation
		if (buildInfo.name == "" || buildInfo.desc == "") {
			alert("Please fill out some build info.") 
			return
		};
		let id = makeId(8);
		let docRef = doc(db, "builds", id);
			getDoc(docRef).then(docSnap => {
				if (docSnap.exists()) {
					console.log("build with id exists, retrying");
					exportBuild();
				} else {
					console.log("unique id found, running")
					// Process data
					let taken = {talents:[], mantras: []};
					for (let category in takenTalents) {
						takenTalents[category].map(talent => taken.talents.push(talent.name));
					}
					for (let category in obtainables.mantras) {
						obtainables.mantras[category].map(mantra => {if (mantra.taken) taken.mantras.push(mantra.name)})
					}
					let data = {
						taken: taken,
						stats: stats,
						buildInfo: buildInfo
					}
					setDoc(doc(db, "builds", id), data)
					navigator.clipboard.writeText(`https://deepwoken-builder.vercel.app/?id=${id}`).then(function() {
						alert("Build link copied to clipboard!");
						console.log('Async: Copying to clipboard was successful!');
					}, function(err) {
						console.error('Async: Could not copy text: ', err);
					});
				}
			})
	}
</script>
<style>
	body {
		padding: 10px;
		background: url(/background.png) repeat;
		overflow: hidden;
	}
	.wrapper {
		position: fixed;
		left: 2vw;
		top: 5vh;
		border: 15px solid;
		border-image: url(/border.png) 45%;
		background-color: #E5E0CA;
		font-family: "Lora", serif;
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
		position: fixed;
		width: inherit;
		left: 2.75vw;
		top: 12vh;
	}
	.stat {
		width: 30%;
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		/*border-image: url(./border.png) 45%;*/
		margin: 2%;
	}
	.stat-item {
		position: relative;
		margin: 6px 3px;
	}
	.stat-input {
		float: right;
		width: 25%;
		height: 10%;
		right: 0;
		font-family: "Lora", "sans-serif";
		border: 1px solid black;
		border-radius: 5px;
		font-size: 14px;
		padding: 1px;
	}
	.stat-input:focus {
		outline: none;
		box-shadow: 0px 0px 5px black;
	}
	#elems {
		border: none;
	}
	/* Talents */
	#searchTalents {
		display: block;
		text-align: center;
		width: 30%;
		margin: auto;
		margin-top: 5px;
		margin-bottom: 5px;
		padding: 5px;
	}
	.talents-wrapper {
		position: fixed;
		top: 42.5vh;
		left: 2vw;
		width: 45%;
		height: 50vh;
	}
	.talents-categories {
		display: flex;
		height: 92%;
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
		height: 85%;
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
		padding: 2px 5px;
	}
	.note {
		color: rgba(0, 0, 0, 0.25);
	}
	/* Obtained Talents */
	.obtained-wrapper {
		position: fixed;
		left: 50vw;
		height: 87.5vh;
		width: 14vw;
	}
	.obtained-talents {
		margin-top: 7vh;
		height: 90%;
		padding: 5px;
	}
	#rare-talent {
		color: rgb(202, 27, 79)
	}
	#legendary-talent {
		color: rgb(56, 211, 115)
	}
	/* Build info */
	.build-info {
		position: fixed;
		left: 67vw;
		width: 30vw;
		height: 29vh;
	}
	#build-name {
		position: fixed;
		left: 69.25vw;
		width: 25%;
		height: 2%;
		text-align: center;
		background-color: transparent;
		border: 10px solid;
		font-family: "Lora", "sans-serif";
		font-size: 20px;
		font-weight: 600;
		border-image: url(/border.png) 45%;
		padding: 5px;
	}
	#build-name:focus, #build-description:focus {
		outline: none;
		box-shadow: 0px 0px 5px black;
	}
	#build-description {
		position: fixed;
		resize: none;
		width: 28%;
		left: 67.9vw;
		top: 15vh;
		height: 12%;
		font-size: 13px;
		background-color: transparent;
		border: 15px solid;
		border-image: url(/border.png) 45%;
		font-family: "Lora", "sans-serif";
	}
	#oaths, #murmurs{
		position: fixed;
		top: 32.75vh;
	}
	#oaths {left: 68vw}
	#murmurs {left: 79vw}
	/* Mantras */
	.mantras {
		position: fixed;
		display: flex;
		left: 67vw;
		top: 42vh;
		height: 24vh;
		width: 30vw;
	}
	.mantras-category {
		width: 33%;
		padding: 5px;
		margin-top: 4.5vh;
	}
	.mantra {
		color:rgba(0, 0, 0, 0.75)
	}
	#mobility {
		border-right: 1px solid rgba(0, 0, 0, 0.5);
		border-left: 1px solid rgba(0, 0, 0, 0.5);
	}
	/* Overview */
	.overview {
		position: fixed;
		left: 67vw;
		top: 74vh;
		height: 18.5vh;
		width: 13vw;
	}
	#export {
		position: fixed;
		top: 32.5vh;
		left: 90vw;
		width: 8%;
		font-family: "Lora", "sans-serif";
		border: 1px solid;
		border-image: url(/border.png) 45%;
		padding: 5px 0px;
		border-image-width: 15px;
		background-color: rgb(0, 32, 10);
		color: white;
	}
	#export:hover {
		box-shadow: 0px 0px 10px black;
	}
	.stat-overview {
		margin-top: 3vh;
		overflow-y: scroll;
		height: 85%;
	}
	/* Credits */
	.credits {
		position: fixed;
		left: 84vw;
		top: 74vh;
		width: 13vw;
		height: 18.5vh;
	}
	a {
		display: block;
	}
	p {
		margin-top: 4vh;
	}
</style>

<body on:mousemove={checkTooltips}>
	<div class="wrapper stat-wrapper">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 8vh; left: 24vw;"> Stats </h3>
		<div class="stats">
			{#each Object.entries(stats) as [statType, statDetails]}
				<div id={statType} class="stat">
					{#each Object.entries(stats[statType]) as [statName, statValue]}
						<div class="stat-item"> 
							{statName} <input {statName} statType={statType} type="number" class="stat-input" on:change={updateStats} value={statValue}>
						</div>
					{/each}
				</div>
			{/each}
		</div>
		<p style="text-align:center; margin: 0; font-weight: 200; position: fixed; top: 33.5vh; left: 20vw;">Investment Points: <b style="font-weight: 700">{points}</b></p>
	</div>
	<!-- Talents -->
	<div class="wrapper talents-wrapper">
		<h3 style="text-align: center; margin: 0"> Talents <i class="note">{talentsCount}</i></h3>
		<input id="searchTalents" placeholder="It's finally here!! Search talents!!!" on:input={updateSearch}>
		<div class="talents-categories">
			{#each Object.entries(obtainables.talents) as [rarity]}
				<div class="talents-category">
					{rarity}
					<div class="talents">
						{#each Object.entries(obtainables.talents[rarity]) as [category, talents]}
							<fieldset>
								<legend><i>{category}</i></legend>
							</fieldset>
							{#each talents as talent (talent)}
								{#if talent.new}
									<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, true)}>
										<span>{talent.name} <span class="note" style="color:red"> •</span><i class="note">{talent.note}</i><br></span>
									</div>
								{:else}
									<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, true)}>
										<span>{talent.name}<i class="note">{talent.note}</i><br></span>
									</div>
								{/if}
							{/each}
						{:else}
							<br />
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
	<!-- Obtained talents-->
	<div class="wrapper obtained-wrapper">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 8vh; left: 52.5vw;"> Obtained Talents <i class="note">{takenTalentsCount}</i></h3>
		<h3 style="text-align: center; font-size: 14px; margin: 0; position: fixed; top: 11vh; left: 52vw;"><i class="note">Click on talents to get them!</i></h3>
		<div class="obtained-talents talents">
			{#each Object.entries(takenTalents) as [category, talents] (talents)}
				<fieldset>
					<legend><i>{category}</i></legend>
				</fieldset>
				{#each talents as talent (talent.name)}
					<div class="name" use:tooltip={talent} on:mousedown={getTalent(category, talent, false)}>
						<span id="{talent.rarity.toLowerCase()}-talent">{talent.name}<i class="note">{talent.note}</i><br></span>
					</div>
				{/each}
			{:else}
				<br />
			{/each}
		</div>
	</div>
	<!-- Build stuff -->
	<div class ="wrapper build-info">
		<b><input id="build-name" placeholder="Build name..." bind:value={buildInfo.name}></b>
		<textarea id="build-description" placeholder="Build description..." bind:value={buildInfo.desc}></textarea>
		<div id="oaths">Oath: <select bind:value={buildInfo.oath}>Oath:
			{#each oaths as mm}
				<option>{mm}</option>
			{/each}
		</select></div>
		<div id="murmurs">Murmur: <select bind:value={buildInfo.murmur}>
			{#each murmurs as mm}
				<option>{mm}</option>
			{/each}
		</select></div>
		<button id="export" on:mousedown={exportBuild}>Export</button>
	</div>
	<!-- Mantras -->
	<div class="wrapper mantras">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 44vh; left: 80.5vw;"> Mantras </h3>
		<h3 style="text-align: center; margin: 0; position: fixed; top: 46.5vh; left: 76.75vw; font-size:14px"><i class="note">Click on mantras to get them!</i></h3>
		{#each Object.entries(obtainables.mantras) as [type, mantras] (mantras)}
			<div style="text-align: center" class="mantras-category" id={type.toLowerCase()}>{type}
				<div class="talents">
					{#each mantras as mantra}
						{#if mantra.taken} 
							<div class="talent mantra" on:mousedown={getMantra(this, mantra, type)} style="font-weight: 700; color:black">{mantra.name} {mantra.stars}</div>
						{:else}
							<div class="talent mantra" on:mousedown={getMantra(this, mantra, type, false)}>{mantra.name} {mantra.stars}</div>
						{/if}
					{/each}
				</div>
			</div>
		{/each}
	</div>
	<!-- Overview -->
	<div class="wrapper overview">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 76vh; left: 71.75vw;"> Overview </h3>
		<div class="stat-overview">
			{#each Object.entries(talentStats) as [statName, statAmount]}
				<span>+<b>{statAmount}</b> {statName}</span><br>
			{/each}
		</div>
	</div>
	<!-- Credits -->
	<div class="wrapper credits">
		<h3 style="text-align: center; margin: 0; position: fixed; top: 76vh; left: 89.75vw;"> Credits </h3>
		<p>By Cyfer#2380. Please send feedback! Export is slow due to too many users...</p>
		<a target="_blank" href="https://discord.gg/deepwokeninfo">Deepwoken Info Discord</a>
		<a target="_blank" href="https://trello.com/b/fRWhz9Ew/deepwoken-talent-list">Trello</a>
	</div>
	<!-- Footer -->
	<p class="footer" style="position: fixed; bottom: -5px; right: 10px; color: white; font-family: 'Lora', 'sans-serif'; font-size: 12px">v1.1.4 - Fixed several talents and added a search bar.</p>
</body>