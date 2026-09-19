import {dev} from '$app/environment';
import * as metrics from '$lib/server/metrics';

// Hot reload would try to listen again
if (!dev) {
  metrics.listen();
}

export const handle = metrics.handle;
