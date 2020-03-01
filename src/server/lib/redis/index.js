import logger from '../../../logger';

const getRedisHashValue = (hashKey, field, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.hget(hashKey, field, (err, result) => {
      if (err) {
        logger.error(`Get hash key: ${hashKey}, field: ${field}, ${err}`);

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const setRedisHashValue = (hashKey, field, value, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.hset(hashKey, field, value, (err, result) => {
      if (err) {
        logger.error(
          `Set hash key: ${hashKey}, field: ${field}, value: ${value}, ${err}`
        );

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const getRedisAllHashValue = (hashKey, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.hgetall(hashKey, (err, result) => {
      if (err) {
        logger.error(`Get hash key: ${hashKey}, ${err}`);

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const deleteRedisHashValue = (hashKey, field, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.hdel(hashKey, field, (err, result) => {
      if (err) {
        logger.error(`Delete hash key: ${hashKey}, field: ${field}, ${err}`);

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const ListPush = (listName, value, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.LPUSH(listName, value, (err, result) => {
      if (err) {
        logger.error(`Push list data: ${listName}, ${err}`);

        return reject(err);
      }

      // logger.info(`Push list data: ${listName}, value: ${value}, success`);
      return resolve(result);
    });
  });
};

const getListLen = (listName, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.LLEN(listName, (err, result) => {
      if (err) {
        logger.error(`Get list length: ${listName}, ${err}`);

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const getList = (listName, start, end, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.LRANGE(listName, start, end, (err, result) => {
      if (err) {
        logger.error(`Get list: ${listName}, ${err}`);

        return reject(err);
      }

      return resolve(result);
    });
  });
};

const deleteList = (listName, redisClient) => {
  return new Promise((resolve, reject) => {
    redisClient.del(listName, (err, result) => {
      if (err) {
        logger.error(`Delete list: ${listName}, ${err}`);
        return reject(err);
      }

      return resolve(result);
    });
  });
};

const updateJobStatus = async (hashKey, jobId, updateData, redisClient) => {
  try {
    const redisResult = await getRedisHashValue(hashKey, jobId, redisClient);

    if (redisResult) {
      let redisResultJson = JSON.parse(redisResult);

      redisResultJson = Object.assign(redisResultJson, updateData);

      await setRedisHashValue(
        hashKey,
        jobId,
        JSON.stringify(redisResultJson),
        redisClient
      );
    } else {
      await setRedisHashValue(
        hashKey,
        jobId,
        JSON.stringify(updateData),
        redisClient
      );
    }

    return {
      code: 0,
      message: `update job: ${jobId}, data: ${JSON.stringify(
        updateData
      )} success`,
    };
  } catch (err) {
    return {
      code: -1,
      message: `Set the redis failed, data: ${JSON.stringify(
        updateData
      )}, error: ${err}`,
    };
  }
};

const updateErrorList = async (hashKey, jobId, updateData, redisClient) => {
  try {
    const redisResult = await getRedisHashValue(hashKey, jobId, redisClient);
    logger.info(`The redis result: ${redisResult}`);

    if (redisResult) {
      const redisResultJson = JSON.parse(redisResult);

      logger.info(
        `The json parse redis result: ${JSON.stringify(redisResultJson)}`
      );

      await setRedisHashValue(
        hashKey,
        jobId,
        JSON.stringify(redisResultJson),
        redisClient
      );
    } else {
      await setRedisHashValue(
        hashKey,
        jobId,
        JSON.stringify(updateData),
        redisClient
      );
    }

    return {
      code: 0,
      message: `update job: ${jobId}, data: ${JSON.stringify(
        updateData
      )} success`,
    };
  } catch (err) {
    return {
      code: -1,
      message: `Set the redis failed, data: ${JSON.stringify(
        updateData
      )}, error: ${err}`,
    };
  }
};

export {
  getRedisHashValue,
  setRedisHashValue,
  getRedisAllHashValue,
  deleteRedisHashValue,
  updateJobStatus,
  updateErrorList,
  ListPush,
  getListLen,
  getList,
  deleteList,
};
