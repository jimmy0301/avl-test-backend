import axios from 'axios';
import logger from '../../../logger';
import { GET_ES_CONTRACT_FAILED } from '../../api/error-code';

const {
  API_SERVER_PROTOCOL,
  API_SERVER_HOST,
  API_SERVER_PORT,
  API_SERVER_VER,
} = process.env;

const url = `${API_SERVER_PROTOCOL}://${API_SERVER_HOST}:${API_SERVER_PORT}/go-platform/${API_SERVER_VER}`;

/*
* es_contract_id – ES Contract id
* plan_start – Contract starts date
* plan_end – Contract ends date
* plan_effective_date – Contract effective date
* plan_type – The contract type. The possible values are:
  1: 企業批售 -- Individual user cannot make change to the plan
  2: 一般合約 -- User is allowed to request changes
  3: 促銷合約 -- Promotion contract. individual user cannot request changes.
* bill_to_type – User’s payment responsibility. The possible values are:
  1: Self-pay
  2: Free – It means GEN will pay for the bill
* cycle_payment_day – The payment cycle starts date.
* payment_type – The type of payment methods that user may choose.
  The following are the possible payment methods now:
  PS: 自行繳款
  BA: 約定扣款
  CU: 約定信用卡授權扣款
* payment_freq – The payment frequency. The following are the possible values:
  1: Monthly
  2. Pay per swap
* bill_delivery_method – The method to deliver the bill.
  1. Email
  2. postal mail
* print_odometer_in_bill – Indicate whether to print scooter odometer on the bill.
  0: Do not print scooter odometer information in the bill.
  1: yes, print it.
* invoice_title – The title to print on the invoice (統一發票)
* vat_number – Customer’s VAT number (統一編號)
* payment_terms  -- When payment_freq is 1,
  this value means the number of months the contract plan has.
* print_uniform_invoice – The possible values are:
  0 : It is not necessary to print the uniform invoice (統一發票)
  1 : Print the uniform invoice.
* plan_price – The base plan price if payment_freq is 1.
* unit_base – The possible values are:
  1: KM-based
  2: 10 mAh-based
* unit_threshold -- The maximum number of units the plan price can cover.
  For example, for KM-based plan, this value is set to be 100 if the plan is $299 for 100 KM.
  over_unit_price – For KM-based plan, this means the per KM price
  if the customer riding distance exceeds the unit_threshold.
  exempt_count – The number of times the customer requested exemption in the payment cycle.
  other_charge_count – The number of other charges in the payment cycle.
  addon_count – The number of plan addons for this payment cycle.
  promotion_count – The number of promotions for this payment cycle.
*/

const getESContract = async (contractId, cycleEndDay, headers) => {
  const apiUrl = `${url}/es-contracts`;
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
    },
  };

  let response;

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (e) {
    logger.error(`Get es-contract by contractId: ${contractId}, error: ${e}`);
    return [];
  }

  const { data, code } = response.data;

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(
      `es-contract id: ${contractId} get es-contract error, additional code: ${additionalCode}, parameter: ${JSON.stringify(
        parameters
      )}`
    );

    return {};
  }

  const filterESContract = data.filter(
    o => o.cycle_end_day === parseInt(cycleEndDay, 10)
  );

  const { user_id: userId, account_type: userType } = filterESContract[0];

  response = {
    account_id: userId,
    contracts: filterESContract,
    account_type: userType,
    merge_bill: 0,
  };

  return response;
};

const getESContractsByUser = async (
  userId,
  userType,
  email,
  mergeBill,
  billStart,
  billEnd,
  billingCycle,
  headers
) => {
  const apiUrl = `${url}/user-es-contracts`;
  const parameters = {
    op_code: 'get',
    get_data: {
      user_id: userId,
      account_type: userType,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  let response;

  const start = process.hrtime();
  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (e) {
    logger.error(
      `userId: ${userId} get es-contract error: ${e}, url: ${apiUrl}, parameter: ${JSON.stringify(
        parameters
      )}`
    );
    return {
      code: GET_ES_CONTRACT_FAILED,
      account_id: userId,
      email,
      account_type: userType,
      merge_bill: mergeBill,
      message: `userId: ${userId} get es-contract error, url: ${apiUrl}, parameter: ${JSON.stringify(
        parameters
      )}`,
    };
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting es-contract: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const { data, code } = response.data;
  const contractData = [];

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(
      `userId: ${userId} get es-contract error, additional code: ${additionalCode}, url: ${apiUrl}, parameter: ${JSON.stringify(
        parameters
      )}`
    );

    return {
      code: GET_ES_CONTRACT_FAILED,
      account_id: userId,
      email,
      account_type: userType,
      merge_bill: mergeBill,
      message: `userId: ${userId} get es-contract error, additional code: ${additionalCode}, url: ${apiUrl}, parameter: ${JSON.stringify(
        parameters
      )}`,
    };
  }

  for (let i = 0; i < data.length; i += 1) {
    const contract = data[i];

    const { cycle_end_day: cycleEndDay } = contract;

    if (cycleEndDay === parseInt(billingCycle, 10)) {
      contractData.push(contract);
    }
  }

  response = {
    account_id: userId,
    contracts: contractData,
    email,
    merge_bill: mergeBill,
    account_type: userType,
  };

  return response;
};

const getContractBalance = async (contractId, headers) => {
  const apiUrl = `${url}/es-contracts/balances`;
  let response = '';
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id_list: [contractId],
    },
  };

  const start = process.hrtime();

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(
      `Get contract balances error: ${err}, parameter: ${JSON.stringify(
        parameters
      )}`
    );

    return { code: -1, message: err };
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting balances: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const { data, code } = response.data;

  if (data === undefined || code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(
      `The es-contract ${contractId} get balances error, additional code: ${additionalCode}, parameters: ${JSON.stringify(
        parameters
      )}`
    );
    return response.data;
  }

  return data;
};

const getContractPlanHistories = async (
  contractId,
  billStart,
  billEnd,
  headers
) => {
  const apiUrl = `${url}/es-contracts/plan-histories`;
  let response = '';
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  const start = process.hrtime();

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(
      `Get contract plan histories error: ${err}, parameter: ${JSON.stringify(
        parameters
      )}`
    );

    return { code: -1, message: err };
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting plan histories: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const { data, code } = response.data;

  if (data === undefined || code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(
      `The es-contract ${contractId} get plan histories error, additional code: ${additionalCode}, parameters: ${JSON.stringify(
        parameters
      )}`
    );
    return response.data;
  }

  const result = [];
  for (let i = 0; i < data.length; i += 1) {
    const {
      plan_start: planStart,
      plan_effective_date: planEffectiveDate,
    } = data[i];

    if (planStart && planEffectiveDate <= billEnd) {
      result.push(data[i]);
    }
  }

  return result;
};

const getContractAddons = async (contractId, billStart, billEnd, headers) => {
  const apiUrl = `${url}/es-contracts/addons`;
  let response = '';
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      time_from: billStart,
      time_to: billEnd,
      search_type: 1,
      pagination_criteria: {
        limit: 2000,
      },
    },
  };

  const start = process.hrtime();

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(
      `Get contract add on error: ${err}, parameters: ${JSON.stringify(
        parameters
      )}`
    );

    return { code: -1, data: [] };
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting escontract addons: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const addonList = [];
  const { data, code } = response.data;

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(`The es-contract ${contractId} get add on error,
    additional code: ${additionalCode}, parameters: ${JSON.stringify(
      parameters
    )}`);

    return response.data;
  }
  // logger.info(`The addon list: ${JSON.stringify(data)}`);

  for (let i = 0; i < data.length; i += 1) {
    const addon = data[i];
    const { end_date: endDate, effective_date: effectiveDate } = addon;
    let usageFrom = effectiveDate;
    let usageTo = endDate;
    let newAddonData = {};

    if (effectiveDate && effectiveDate <= billEnd) {
      if (effectiveDate < billStart) {
        usageFrom = billStart;
      }

      if (endDate > billEnd || endDate === undefined) {
        usageTo = billEnd;
      }

      newAddonData = Object.assign(addon, {
        usage_from: usageFrom,
        usage_to: usageTo,
      });

      addonList.push(newAddonData);
    }
  }

  return addonList;
};

const getContractPromotions = async (
  contractId,
  billStart,
  billEnd,
  headers
) => {
  const apiUrl = `${url}/es-contracts/promotions`;
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  let response = '';

  const start = process.hrtime();

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(`Get contract promotion failed: ${err}`);

    return [];
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting escontract promotions: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const { code } = response.data;

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(`The es-contract ${contractId} get promotion error,
    additional code: ${additionalCode}, parameters: ${JSON.stringify(
      parameters
    )}`);

    return response.data;
  }

  // logger.info(`The response of the promotion: ${JSON.stringify(response)}`);
  return response.data.data;
};

const getContractScooters = async (
  contractId,
  scooterIds,
  billStart,
  billEnd,
  headers
) => {
  const apiUrl = `${url}/es-contracts/scooters`;
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  let response = '';

  const start = process.hrtime();

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(`Get contract ${contractId} scooter failed: ${err}`);

    return [];
  }

  const end = process.hrtime(start);

  logger.info(
    `Total execution time for getting escontract scooters: ${end[0] * 1000 +
      end[1] / 1000000}ms`
  );

  const { data, code } = response.data;

  if (code === -1) {
    const { additional_code: additionalCode } = response.data;

    logger.error(`The es-contract ${contractId} get es-contract scooters error,
    additional code: ${additionalCode}, parameters: ${JSON.stringify(
      parameters
    )}`);

    return response.data;
  }

  let scooterIdList = [];

  if (scooterIds !== null) {
    for (let i = 0; i < data.length; i += 1) {
      const scooterObj = data[i];
      for (let j = 0; j < scooterIds.length; j += 1) {
        if (scooterObj.scooter_id === scooterIds[j]) {
          scooterIdList.push(scooterObj);
        }
      }
    }
  } else {
    scooterIdList = data;
  }

  return scooterIdList;
};

const getContractOtherCharge = async (
  contractId,
  billStart,
  billEnd,
  headers
) => {
  const apiUrl = `${url}/es-contracts/other-charges`;
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      charged_flag: 1,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  let response = '';

  // console.log('The headers:', headers);

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(`Get contract other charge failed: ${err.response.data}`);

    return [];
  }

  return response.data.data;
};

const getContractExempt = async (contractId, billStart, billEnd, headers) => {
  const apiUrl = `${url}/es-contracts/exempts`;
  const parameters = {
    op_code: 'get',
    get_data: {
      es_contract_id: contractId,
      time_from: billStart,
      time_to: billEnd,
    },
  };

  let response = '';

  try {
    response = await axios.post(apiUrl, parameters, { headers });
  } catch (err) {
    logger.error(`Get contract exempt failed: ${err}`);

    return [];
  }

  const exemptDataList = [];

  const { data } = response.data;

  for (let i = 0; i < data.length; i += 1) {
    const exemptData = data[i];
    const { exempt_from: exemptFrom, exempt_to: exemptTo } = exemptData;
    const newExemptData = {};

    if (exemptFrom < billStart) {
      newExemptData.exempt_from = billStart;
      newExemptData.exempt_to = exemptTo;
    } else if (exemptTo > billEnd) {
      newExemptData.exempt_from = exemptFrom;
      newExemptData.exempt_to = billEnd;
    } else {
      newExemptData.exempt_from = exemptFrom;
      newExemptData.exempt_to = exemptTo;
    }

    exemptDataList.push(newExemptData);
  }

  return exemptDataList;
};

export {
  getESContract,
  getESContractsByUser,
  getContractBalance,
  getContractPlanHistories,
  getContractExempt,
  getContractOtherCharge,
  getContractAddons,
  getContractPromotions,
  getContractScooters,
};
