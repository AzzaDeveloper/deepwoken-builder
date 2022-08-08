<script>
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
	}
</script>

<style>
	body {
		padding: 10px;
		background: url(./background.png);
	}
	.wrapper {
		width: 40%;
		border: 15px solid black;
		border-image: url(./border.png) 45%;
		background-color: #E5E0CA;
		font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
		font-size: 15px;
		font-weight: 600;
		color: black;
	}
	.stats {
		display: flex;
	}
	.stat {
		width: 30%;
		border-right: 15px solid black;
		border-image: url(./border.png) 45%;
		margin: 10px;
	}
	.stat-item {
		position: relative;
		margin: 5px
	}
	.stat-input {
		float: right;
		width: 25%;
		right: 0;
	}
	#elemStats {
		border: none;
	}
</style>

<body>
	<div class="wrapper">
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
	
</body>