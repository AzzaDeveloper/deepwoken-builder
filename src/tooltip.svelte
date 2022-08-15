<script>
	export let data;
	export let x;
	export let y;
</script>

<style>
	.wrapper {
		position: absolute;
		border: 15px solid;
		border-image: url(/border.png) 45%;
		background-color: #e5e0ca;
		width: 20vw;
		font-family: "Lora", serif;
		font-size: 15px;
	}
	.tags {
		display: flex;
		flex-wrap: wrap;
	}
	.req {
		padding: 0px 5px;
		margin: 3px;
		border-radius: 10px;
		font-size: 12px;
		border: 5px solid transparent;
		color: white;
		display:block;
	}
	.buggedReq {
		background-color: black;
	}
	.noReqs, .power, .strength, .fortitude, .agility, .intelligence, .willpower, .charisma {
		background-color: dimgray;
	}
	.mantra, .equipped, .talent {
		background-color: darkslategrey;
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
<div tooltip="true" style="top: {y - 75}px; left: {x + 10}px;" class="wrapper">
	<div id="tags">
		{#if data.reqs == "None"}
			<span class="req noReqs">No Requirements</span>
		{:else}
			{#if data.power > 0}
				<span class="power req">Power: {data.power}</span><br />
			{/if}
			{#each Object.entries(data.reqs) as [statName, statAmount]}
				{#if statName == "undefined" || statName == ""}
					<span class="req buggedReq">Unknown, let me know</span>
				{:else}
					<span class="req {statName.toLowerCase()}"><b>{statName}</b>: {statAmount}</span>
				{/if}
			{/each}
			{#each data.extraReqs as req}
				<span class="req {req.type.toLowerCase()}"><b>{req.type}</b>: {req.content}</span>
			{/each}
		{/if}
	</div>
	<p>{data.desc}</p>
	{#if data.stats != "None"}
		{#each Object.entries(data.stats) as [statName, statAmount]}
			<span style="color: rgba(0, 0, 0, 0.5)">{statName}: {statAmount}</span><br>
		{/each}
	{/if}
</div>
