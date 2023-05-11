import monitoring from '@google-cloud/monitoring';
import { NODE_PROVIDER, PROJECT_ID } from '../config';

const client = new monitoring.MetricServiceClient();

export async function writeTimeSeriesData(
  logTitle: string,
  value: number,
  callName: string
) {
  if (!PROJECT_ID) {
    console.warn(
      'writeTimeSeriesData: PROJECT_ID environment variable cannot be empty'
    );
    return;
  }
  const dataPoint = {
    interval: {
      endTime: {
        seconds: Date.now() / 1000,
      },
    },
    value: {
      doubleValue: value,
    },
  };

  const timeSeriesData = {
    metric: {
      type: `custom.googleapis.com/ens/${logTitle}`,
      labels: {
        provider: NODE_PROVIDER,
        callName,
      },
    },
    resource: {
      type: 'global',
      labels: {
        project_id: PROJECT_ID,
      },
    },
    points: [dataPoint],
  };

  const request = {
    name: client.projectPath(PROJECT_ID),
    timeSeries: [timeSeriesData],
  };

  const result = await client.createTimeSeries(request);
  console.info('Done writing time series data.', result);
}
