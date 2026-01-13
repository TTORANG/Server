import { CloudTasksClient } from "@google-cloud/tasks";
import { createConversionJob } from "../repositories/conversionJob.repository.js";

// Lazy initialization - 실제 사용 시에만 클라이언트 생성
let client = null;

function getClient() {
  if (!client) {
    client = new CloudTasksClient();
  }
  return client;
}

const PROJECT_ID = process.env.GCP_PROJECT_ID;
const LOCATION = process.env.GCP_LOCATION || "asia-northeast3";
const QUEUE_NAME = process.env.CLOUD_TASKS_QUEUE_NAME || "conversion-queue";
const SERVICE_URL = process.env.CLOUD_RUN_SERVICE_URL;

//Cloud Tasks 큐에 변환 작업을 추가합니다.
export async function enqueueConversionTask({ conversionJobId, jobType, delaySeconds = 0 }) {
  // 환경변수 체크
  if (!PROJECT_ID || !SERVICE_URL) {
    console.warn("[CloudTasks] Missing environment variables. Skipping task enqueue.");
    console.warn("[CloudTasks] Set GCP_PROJECT_ID and CLOUD_RUN_SERVICE_URL to enable.");
    return null;
  }

  const tasksClient = getClient();
  const parent = tasksClient.queuePath(PROJECT_ID, LOCATION, QUEUE_NAME);

  //worker/process-job
  const payload = {
    conversionJobId,
    jobType,
  };

  const task = {
    httpRequest: {
      httpMethod: "POST",
      url: `${SERVICE_URL}/worker/process-job`,
      headers: {
        "Content-Type": "application/json",
      },
      body: Buffer.from(JSON.stringify(payload)).toString("base64"),
      oidcToken: {
        serviceAccountEmail: process.env.CLOUD_TASKS_SERVICE_ACCOUNT,
      },
    },
  };

  if (delaySeconds > 0) {
    task.scheduleTime = {
      seconds: Math.floor(Date.now() / 1000) + delaySeconds,
    };
  }

  const [response] = await tasksClient.createTask({ parent, task });

  console.log(`Task created: ${response.name}`);
  return response.name;
}

export async function createAndEnqueueConversionJob({ uploadedFileId, jobType }) {
  const conversionJob = await createConversionJob({ uploadedFileId, jobType });

  await enqueueConversionTask({
    conversionJobId: conversionJob.id.toString(),
    jobType,
  });

  return conversionJob;
}
