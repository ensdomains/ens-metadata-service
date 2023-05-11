import { performance } from 'node:perf_hooks';
import { logger } from './logging';
import { writeTimeSeriesData } from './customLogMonitoring';

export async function measureLatency(
  ctx: any = null,
  fn: Function,
  ...args: any
) {
  const startTime = performance.now();
  try {
    const result = await fn.call(ctx, ...args);
    const endTime = performance.now();
    const latency = endTime - startTime;
    const callName = fn?.name || ctx?.constructor.name;
    await writeTimeSeriesData('provider_latency', latency, callName);
    logger.info(`${callName} latency: ${latency.toFixed(2)} ms`);
    return result;
  } catch (error) {
    const endTime = performance.now();
    const latency = endTime - startTime;
    const callName = fn?.name || ctx?.constructor.name;
    await writeTimeSeriesData('provider_latency', latency, `${callName}_error`);
    logger.warn(`${callName} latency: ${latency.toFixed(2)} ms (Error)`);
    throw error;
  }
}
