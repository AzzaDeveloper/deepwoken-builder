<script>
    /*import { webVitals } from '../lib/vitals.js';
    import { browser } from '$app/env';
    import { page } from '$app/stores';
  
    let analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  
    $: if (browser && analyticsId) {
        webVitals({
            path: $page.url.pathname,
            params: $page.params,
            analyticsId
        })
    }*/ 
   // import Analytics from '../lib/analytics.svelte';
</script>

<!--<Analytics />-->
  
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Lora:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600;1,700&display=swap" rel="stylesheet">
<slot />