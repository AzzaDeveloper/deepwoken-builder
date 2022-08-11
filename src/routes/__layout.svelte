<script>
    import { webVitals } from '../lib/vitals.js';
    import { browser } from '$app/env';
    import { page } from '$app/stores';
  
    let analyticsId = import.meta.env.VERCEL_ANALYTICS_ID;
  
    $: if (browser && analyticsId) {
        webVitals({
            path: $page.url.pathname,
            params: $page.params,
            analyticsId
        })
    }
</script>
  
<slot />