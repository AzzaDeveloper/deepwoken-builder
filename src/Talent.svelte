<script>
    export let talentInfo = {};
</script>

<style>
    fieldset { 
        border: none;
        border-top: 1px solid rgba(0, 0, 0, 0.5);
        color:rgba(0, 0, 0, 0.5);
        padding: 0px;
    }
    .name {
        padding: 5px;
    }
</style>

<div>
    <fieldset>
        <legend><i>{talentInfo.tree}</i></legend>
    </fieldset>
    <span class="name">{talentInfo.name}</span>
</div>