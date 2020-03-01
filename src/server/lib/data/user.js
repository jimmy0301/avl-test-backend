import axios from 'axios';
import Promise from 'bluebird';
import logger from '../../../logger';
import { genBillingEngineUrl } from '../utils/utils';
import {
  updateJobStatus,
  setRedisHashValue,
  deleteRedisHashValue,
  getRedisHashValue,
} from '../redis';
import {
  NOT_CALCULATE_YET,
  SCOOTER_VIN,
  SCOOTER_ID,
  SCOOTER_PLATE,
  GOGORO_USER_ID,
  GOGORO_USER_EMAIL,
} from '../../api/data-type';
import {
  CALCULATE_ALL_DATA,
  RECALCULATED,
  RECALCULATED_ERROR,
  RECALCULATED_GEN_ERROR,
  TRANSFER_BILL,
} from '../../api/job-type';
import {
  SEND_REQUEST_TO_BILLING_ENGINE_FAILED,
  NO_BILL_TO_CALCULATE,
  GET_ES_CONTRACT_FAILED,
} from '../../api/error-code';

const {
  API_SERVER_PROTOCOL,
  API_SERVER_HOST,
  API_SERVER_PORT,
  API_SERVER_VER,
  REDIS_HASH_KEY,
  BILLLING_ENGINE_REQUEST_CONCURRENT,
  // CONCURRENT_NUM,
  GOAUTH_SVC_CLIENT_ID,
  REDIS_ERROR_KEY,
} = process.env;

const SUCCESS = 0;
const PROCESS = 2;
const CALCULATED = 3;

const ACTIVATED = 1;
const TERMINATED = 3;
const TRANSFER = 4;

const getAllESContract = async (
  billDateInfo,
  maxCount,
  serviceAuth,
  jobId,
  createJob,
  res,
  redisClient
) => {
  const url = `${API_SERVER_PROTOCOL}://${API_SERVER_HOST}:${API_SERVER_PORT}/go-platform/${API_SERVER_VER}`;
  const contractApi = `${url}/es-contracts`;
  let response = {};
  let cipher = '';

  try {
    cipher = await serviceAuth.getCipher(GOAUTH_SVC_CLIENT_ID);
  } catch (err) {
    logger.error(`Get the cipher failed, ${err}`);

    try {
      cipher = await serviceAuth.getCipher(GOAUTH_SVC_CLIENT_ID);
    } catch (error) {
      logger.error(`The second time get cipher failed, ${error}`);
      cipher = '';

      return {
        code: -1,
        message: `The second time get cipher failed, ${error}`,
      };
    }
  }

  const headers = {
    headers: {
      'GO-Client': GOAUTH_SVC_CLIENT_ID,
      Authorization: `Bearer ${cipher}`,
    },
  };

  const lastCalculateDate = parseInt(billDateInfo.billing_cycle_start, 10) - 1;

  const parameters = {
    op_code: 'search',
    search_data: {
      cycle_end_day: billDateInfo.cycle_end_day,
      contract_time_from: billDateInfo.billing_cycle_start,
      contract_time_to: billDateInfo.billing_cycle_end,
      // latest_bill_calc_end_date_to: lastCalculateDate,
      status_list: [ACTIVATED, TERMINATED, TRANSFER],
      pagination_criteria: {
        offset: 0,
        limit: maxCount,
      },
    },
  };

  logger.info(
    `Get the first es-contract list, parameter: ${JSON.stringify(parameters)}`
  );
  logger.info(`The contract API: ${contractApi}`);

  try {
    response = await axios.post(`${contractApi}`, parameters, headers);
  } catch (err) {
    logger.info(`Get es-contract list failed: ${err}`);

    return {
      code: GET_ES_CONTRACT_FAILED,
      http_error: `${err}`,
      message: 'Get the first es-contract list failed',
    };
  }

  let { code } = response.data;

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;
    logger.error(
      `Get the first es-contract list failed, the additional code ${additionalCode}`
    );

    return {
      code: GET_ES_CONTRACT_FAILED,
      message: `Get the first es-contract list failed, the additional code ${additionalCode}`,
    };
  }

  const { data, total_count: totalCount } = response.data;

  if (createJob) {
    if (totalCount <= 0) {
      logger.info(
        `There is no es-contract to generate bill at this billing cycle ${billDateInfo.billing_cycle_start} ~ ${billDateInfo.billing_cycle_end}`
      );

      try {
        await deleteRedisHashValue(REDIS_HASH_KEY, jobId, redisClient);
      } catch (error) {
        logger.error(`delete job: ${jobId} failed, ${error}`);
      }

      return [];
    }

    const updateResult = await updateJobStatus(
      REDIS_HASH_KEY,
      jobId,
      { total_count: totalCount },
      redisClient
    );

    if (!updateResult) {
      logger.error(`Update job id ${jobId} total count failed`);

      return {
        code: -1,
        message: `Update job id ${jobId} total count failed`,
      };
    }
  }

  res.json({ code: 0, message: 'Success' });

  logger.info(`The total count: ${totalCount}`);
  let remainCount = totalCount - data.length;
  const contractList = data.filter(
    esContract =>
      esContract.latest_bill_calc_end_date === undefined ||
      esContract.latest_bill_calc_end_date <= lastCalculateDate
  );

  let offset = data.length;

  /* eslint-disable no-await-in-loop */
  while (remainCount > 0) {
    logger.info(`remainCount: ${remainCount}`);
    const paginationCriteria = { offset, limit: maxCount };
    parameters.search_data.pagination_criteria = paginationCriteria;

    logger.info(`The parameters in the loop: ${JSON.stringify(parameters)}`);

    try {
      cipher = await serviceAuth.getCipher(GOAUTH_SVC_CLIENT_ID);
    } catch (err) {
      logger.error(`Get the cipher failed, ${err}`);

      try {
        cipher = await serviceAuth.getCipher(GOAUTH_SVC_CLIENT_ID);
      } catch (error) {
        logger.error(`The second time get cipher failed, ${error}`);
        cipher = '';

        return {
          code: -1,
          message: `The second time get cipher failed, ${error}`,
        };
      }
    }

    headers.headers.Authorization = `Bearer ${cipher}`;

    logger.info(`${JSON.stringify(parameters)}`);

    try {
      response = await axios.post(contractApi, parameters, headers);
    } catch (err) {
      logger.error(
        `offset: ${offset} get es-contract failed, error: ${err.response.data}`
      );

      return {
        code: GET_ES_CONTRACT_FAILED,
        message: `offset: ${offset} get es-contract failed, error: ${err}`,
      };
    }

    ({ code } = response.data);

    if (code === -1) {
      const { additional_code: additionalCode } = response.data;

      logger.error(
        `offset: ${offset}, get es-contract failed, code: ${code}, additionalCode: ${additionalCode}`
      );

      return {
        code: GET_ES_CONTRACT_FAILED,
        message: `offset: ${offset}, get es-contract failed, code: ${code}, additionalCode: ${additionalCode}`,
      };
    }

    const { data: esContractList } = response.data;

    const filterESContractList = esContractList.filter(
      esContract =>
        esContract.latest_bill_calc_end_date === undefined ||
        esContract.latest_bill_calc_end_date < lastCalculateDate
    );

    contractList.push(...filterESContractList);

    offset += esContractList.length;
    remainCount -= esContractList.length;
  }
  /* eslint-disable no-await-in-loop */

  console.log(JSON.stringify(contractList));
  return contractList;
};

const sendDataToBillingEngine = async ({
  protocol,
  host,
  port,
  maxCount,
  billingCycleStart,
  billingCycleEnd,
  billStart,
  billEnd,
  defaultIssueTime,
  dueDate,
  billDate,
  cycleEndDay,
  dataType,
  serviceAuth,
  jobId,
  jobType,
  data,
  res,
  applyNow,
  redisClient,
}) => {
  let createJob = false;
  let resultJSON = null;

  if (jobType === CALCULATE_ALL_DATA || jobType === RECALCULATED) {
    const jobData = {
      data_type: dataType,
      job_type: jobType,
      status: PROCESS,
      success_count: 0,
      failed_count: 0,
      total_count: 0,
      approved_count: 0,
      billing_cycle_start: billingCycleStart, // billing cycle 起始日
      billing_cycle_end: billingCycleEnd, // billing cycle 截止日
      payment_due_date: dueDate, // 繳費截止日
      bill_issue_date: billDate, // 出帳日
      default_issue_time: defaultIssueTime,
    };

    let redisSetResult = '';

    if (!applyNow) {
      try {
        redisSetResult = await setRedisHashValue(
          REDIS_HASH_KEY,
          jobId,
          JSON.stringify(jobData),
          redisClient
        );

        createJob = true;
        console.log(redisSetResult);
      } catch (err) {
        logger.error(`Calculate all bills and set redis failed, ${err}`);

        res.json({
          code: -1,
          http_error: `${err}`,
          message: 'Calculate all bills and set redis failed',
        });

        return;
      }
    }
  } else if (jobType !== TRANSFER_BILL && !applyNow) {
    const result = await getRedisHashValue(REDIS_HASH_KEY, jobId, redisClient);

    if (result) {
      resultJSON = JSON.parse(result);

      res.json({ code: 0, message: 'success' });
    } else {
      logger.error(
        `Get redis job data failed for recalculated error, jobId: ${jobId}`
      );

      res.json({
        code: -1,
        job_id: jobId,
        job_type: jobType,
        message: 'There is no job',
      });

      return;
    }
  }
  const protocolArr = protocol.split(',');
  const hostArr = host.split(',');
  const portArr = port.split(',');
  const billingEngineUrlArr = genBillingEngineUrl(
    protocolArr,
    hostArr,
    portArr
  );

  let totalBills = 0;

  logger.info(
    `There are billing engine urls: ${JSON.stringify(billingEngineUrlArr)}`
  );

  const billDateInfo = {
    billing_period_start:
      billStart === undefined ? billingCycleStart : billStart,
    billing_period_end: billEnd === undefined ? billingCycleEnd : billEnd,
    payment_due_date: dueDate,
    bill_issue_date: billDate,
    billing_cycle_start: billingCycleStart,
    billing_cycle_end: billingCycleEnd,
    default_issue_time: defaultIssueTime,
    cycle_end_day: cycleEndDay,
  };

  let dataList = data;

  if (jobType === CALCULATE_ALL_DATA || dataType === NOT_CALCULATE_YET) {
    try {
      dataList = await getAllESContract(
        billDateInfo,
        maxCount,
        serviceAuth,
        jobId,
        createJob,
        res,
        redisClient
      );

      if (!Array.isArray(dataList)) {
        res.json(dataList);

        try {
          await deleteRedisHashValue(REDIS_HASH_KEY, jobId, redisClient);
        } catch (error) {
          logger.error(`Delete job failed, ${error}`);
        }

        return;
      }

      if (dataList.length <= 0) {
        res.json({
          code: NO_BILL_TO_CALCULATE,
          message: 'There is no bill to calculate',
        });

        return;
      }

      dataList = dataList.map(esContract => {
        const { es_contract_id: esContractId } = esContract;

        return esContractId;
      });

      logger.info(`Total es-contract: ${dataList.length}`);
      // logger.info(`the first user: ${JSON.stringify(uidList[0])}`);
    } catch (err) {
      logger.error(`Get es-contract list, error: ${err}`);

      res.json({
        code: -1,
        message: `Get es-contract list, error: ${err}`,
      });

      if (createJob && jobType !== TRANSFER_BILL) {
        try {
          await deleteRedisHashValue(REDIS_HASH_KEY, jobId, redisClient);
        } catch (error) {
          logger.error(`delete job failed, ${error}`);
        }
      }

      return;
    }
  }

  totalBills = dataList.length;

  if (totalBills <= 0) {
    logger.info(
      `There is no data to generate bill at this billing cycle ${billDateInfo.billing_cycle_start} ~ ${billDateInfo.billing_cycle_end}`
    );

    if (jobType === TRANSFER_BILL || applyNow) {
      res.json({
        code: -1,
        message: 'There is no data to generate bill at this billing cycle',
      });
    }

    if (createJob) {
      try {
        await deleteRedisHashValue(REDIS_HASH_KEY, jobId, redisClient);
      } catch (error) {
        logger.error(`[Generate bill] Delete job failed, ${error}`);
      }
    }
  } else {
    let successCount = 0;
    let failedCount = 0;
    let billingUrl = `${billingEngineUrlArr[0]}/es-contract/bill`;

    if (
      jobType === RECALCULATED &&
      dataType !== NOT_CALCULATE_YET &&
      !applyNow
    ) {
      res.json({ code: 0, message: 'Success' });
    }

    if (createJob) {
      const updateResult = await updateJobStatus(
        REDIS_HASH_KEY,
        jobId,
        {
          total_count: totalBills,
        },
        redisClient
      );

      if (!updateResult) {
        logger.error(`Update job id ${jobId} total count failed`);

        res.json({
          code: -1,
          message: `Update job id ${jobId} total count failed`,
        });

        return;
      }
    }
    if (
      dataType === SCOOTER_VIN ||
      dataType === SCOOTER_ID ||
      dataType === SCOOTER_PLATE
    ) {
      billingUrl = `${billingEngineUrlArr[0]}/scooter/bill`;
    } else if (dataType === GOGORO_USER_ID || dataType === GOGORO_USER_EMAIL) {
      billingUrl = `${billingEngineUrlArr[0]}/user/bill`;
    }

    const errorList = [];
    const pendingApprovalIdList = [];

    // dataList = ['pLbxlE4N', '8RAKM2Mm'];
    logger.info(`The data list: ${JSON.stringify(dataList)}`);
    logger.info('Start to send data to billing-engine');
    const billPromise = Promise.map(
      dataList,
      async id => {
        const parameters = {
          billingUrl,
          data_type: dataType,
          ...billDateInfo,
          re_calculate:
            (jobType === RECALCULATED && !applyNow) ||
            jobType === RECALCULATED_GEN_ERROR
              ? 1
              : 0,
          data: [id],
        };
        let errorData = {};

        logger.info(`The calculate parameters: ${JSON.stringify(parameters)}`);

        try {
          const billResult = await axios.post(billingUrl, parameters);
          const { data: billDataResult } = billResult;

          logger.info(
            `The billing-engine response code: ${JSON.stringify(
              billDataResult.code
            )}`
          );
          if (billDataResult.code === SUCCESS) {
            const { result: resultData } = billDataResult;

            for (let i = 0; i < resultData.length; i += 1) {
              logger.info(`Response result: ${JSON.stringify(resultData[i])}`);
              if (resultData[i].code !== SUCCESS) {
                failedCount += 1;

                errorData = Object.assign(resultData[i], parameters, {
                  id,
                  job_type: jobType,
                });

                delete errorData.data;

                errorList.push(errorData);
              } else {
                successCount += 1;
                pendingApprovalIdList.push(id);
              }
            }
          } else {
            failedCount += 1;

            errorData = Object.assign(billDataResult, parameters, {
              id,
              job_type: jobType,
            });

            delete errorData.data;

            errorList.push(errorData);
          }

          if (createJob && jobType !== TRANSFER_BILL) {
            await updateJobStatus(
              REDIS_HASH_KEY,
              jobId,
              {
                success_count: successCount,
                failed_count: failedCount,
              },
              redisClient
            );
          }

          return billResult.data;
        } catch (err) {
          logger.error(
            `id: ${id}, dataType: ${dataType}, jobType: ${jobType} send data to billing-engine failed, ${err}`
          );

          failedCount += 1;

          errorData = Object.assign(
            {
              code: SEND_REQUEST_TO_BILLING_ENGINE_FAILED,
              job_type: jobType,
              data_type: dataType,
              id,
              message: `id: ${id}, dataType: ${dataType}, jobType: ${jobType} send data to billing-engine failed, ${err}`,
            },
            parameters
          );

          delete errorData.data;

          errorList.push(errorData);

          if (createJob && jobType !== TRANSFER_BILL) {
            await updateJobStatus(
              REDIS_HASH_KEY,
              jobId,
              {
                failed_count: failedCount,
              },
              redisClient
            );
          }

          return {
            code: SEND_REQUEST_TO_BILLING_ENGINE_FAILED,
            data_type: dataType,
            job_type: jobType,
            id,
            http_error: `${err}`,
            message: 'Send data to billing-engine failed',
          };
        }
      },
      { concurrency: parseInt(BILLLING_ENGINE_REQUEST_CONCURRENT, 10) }
    );

    const responseRes = await Promise.all(billPromise);

    logger.info(
      `End to send data to billing-engine, the result: ${JSON.stringify(
        responseRes
      )}`
    );

    if (jobType === RECALCULATED && !applyNow) {
      const updateResult = await updateJobStatus(
        REDIS_HASH_KEY,
        jobId,
        {
          data: pendingApprovalIdList,
        },
        redisClient
      );

      if (!updateResult) {
        logger.error(`Update job id ${jobId} pending approval id failed`);

        res.json({
          code: -1,
          message: `Update job id ${jobId} pending approval id failed`,
        });

        return;
      }
    }

    if (jobType === TRANSFER_BILL || applyNow) {
      res.json(responseRes[0]);

      return;
    }

    if (jobType === RECALCULATED_ERROR || jobType === RECALCULATED_GEN_ERROR) {
      logger.info(`Re-calculate error update job status, jobId: ${jobId}`);
      const finalDataId = resultJSON.data;

      for (let i = 0; i < pendingApprovalIdList; i += 1) {
        if (resultJSON.data.indexOf(pendingApprovalIdList[i]) === -1) {
          finalDataId.push(pendingApprovalIdList[i]);
        }
      }

      await updateJobStatus(
        REDIS_HASH_KEY,
        jobId,
        {
          success_count: resultJSON.success_count + successCount,
          failed_count: errorList.length,
          data: finalDataId,
        },
        redisClient
      );

      await deleteRedisHashValue(REDIS_ERROR_KEY, jobId, redisClient);
    }

    logger.info(`number of error: ${errorList.length}`);
    if (jobType !== TRANSFER_BILL || !applyNow) {
      try {
        const result = await setRedisHashValue(
          REDIS_ERROR_KEY,
          jobId,
          JSON.stringify(errorList),
          redisClient
        );

        console.log(result);
      } catch (err) {
        logger.error(`There is an error for saving error: ${err}`);
      }

      logger.info('End to save error list');
    }

    if (createJob && jobType !== TRANSFER_BILL && !applyNow) {
      await updateJobStatus(
        REDIS_HASH_KEY,
        jobId,
        {
          status: CALCULATED,
        },
        redisClient
      );
    }
  }
};

export default sendDataToBillingEngine;
