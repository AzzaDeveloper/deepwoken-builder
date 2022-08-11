<script>
	export let data;
	export let x;
	export let y;
</script>

<style>
	.wrapper {
		position: absolute;
		border: 15px solid black;
		border-image: url(/border.png) 45%;
		background-color: white;
		width: 30vh;
		font-family: sans-serif;
		font-size: 15px;
	}
	.req {
		padding: 5px;
		border-radius: 10px;
		font-size: 10px;
		border: 5px solid white;
		color: white;
	}
	.buggedReq {
		background-color: black;
	}
	.noReqs, .power, .strength, .fortitude, .agility, .intelligence, .willpower, .charisma {
		background-color: dimgray;
	}
	.medium, .heavy, .light {
		background-color: rgb(211, 211, 211);
	}
	.flamecharm {
		background-color: orange;
	}
	.frostdraw {
		background-color: cyan;
	}
	.thundercall {
		background-color: yellow;
		color: black;
	}
	.galebreath {
		background-color: lime;
	}
	.shadowcast {
		background-color: rgb(50, 50, 50);
	}
</style>
<div tooltip="true" style="top: {y + 5}px; left: {x + 5}px;" class="wrapper">
	<div id="tags">
		{#if data.reqs == "None"}
			<span class="req noReqs">No Requirements</span>
		{:else}
			{#if data.power > 0}
				<span class="power req">Power: {data.power}</span>
			{/if}
			{#each Object.entries(data.reqs) as [statName, statAmount]}
				{#if statName == "undefined" || statName == ""}
					<span class="req buggedReq">Unknown, let me know</span>
				{:else}
					<span class="req {statName.toLowerCase()}">{statName}: {statAmount}</span>
				{/if}
			{/each}
		{/if}
	</div>
	<p>{data.desc}</p>
</div>
