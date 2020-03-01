import fs from 'fs';
import Promise from 'bluebird';
import moment from 'moment-timezone';

const SINGLE_QUERY = 0;
const MULTIPLE_QUERY_AND = 1;
const MULTIPLE_QUERY_OR = 2;
const MULTIPLE_QUERY_TIME = 3;

const { TIME_ZONE, DEFAULT_DATE } = process.env;

const timeToInt = (timeFromString, timeToString) => {
  const momentTimeFrom = moment.tz(
    `${DEFAULT_DATE} ${timeFromString}`,
    'YYYY/MM/DD HH:mm',
    TIME_ZONE
  );
  const momentTimeTo = moment.tz(
    `${DEFAULT_DATE} ${timeToString}`,
    'YYYY/MM/DD HH:mm',
    TIME_ZONE
  );

  if (momentTimeTo.isBefore(momentTimeFrom)) {
    return {
      timeFrom: momentTimeFrom.unix(),
      timeTo: momentTimeTo.add('1', 'days').unix(),
    };
  }

  return {
    timeFrom: momentTimeFrom.unix(),
    timeTo: momentTimeTo.unix(),
  };
};

const getRestaurant = async (req, res) => {
  const {
    queryType,
    menuType,
    deposit,
    parking,
    delivery,
    latitude,
    longitude,
    offset = 0,
    limit = 10,
  } = req.query;
  let sql = 'SELECT * FROM restaurant';
  const params = [];

  console.log(queryType);
  if (parseInt(queryType, 10) === SINGLE_QUERY) {
    if (
      menuType !== undefined &&
      parseInt(menuType, 10) >= 0 &&
      parseInt(menuType, 10) <= 11
    ) {
      sql = `${sql} WHERE menu_type = ?`;
      params.push(parseInt(menuType, 10));
    } else if (
      deposit !== undefined &&
      (parseInt(deposit, 10) === 0 || parseInt(deposit, 10) === 1)
    ) {
      sql = `${sql} WHERE deposit = ?`;
      params.push(parseInt(deposit, 10));
    } else if (
      parking !== undefined &&
      (parseInt(parking, 10) === 0 || parseInt(parking, 10) === 1)
    ) {
      sql = `${sql} WHERE parking = ?`;
      params.push(parseInt(parking, 10));
    } else if (
      delivery !== undefined &&
      (parseInt(delivery, 10) === 0 || parseInt(delivery, 10) === 1)
    ) {
      sql = `${sql} WHERE delivery = ?`;
      params.push(parseInt(delivery, 10));
    } else if (latitude !== undefined) {
      sql = `${sql} WHERE ST_X(position) >= ?`;
      params.push(latitude);
    } else if (longitude !== undefined) {
      sql = `${sql} WHERE ST_Y(position) >= ?`;
      params.push(longitude);
    } else {
      res.json({ code: -1, message: 'Please give at least one condition' });

      return;
    }
  } else if (parseInt(queryType, 10) === MULTIPLE_QUERY_AND) {
    // AND condition
    let hasFirstCondition = false;
    if (
      menuType !== undefined &&
      parseInt(menuType, 10) >= 0 &&
      parseInt(menuType, 10) <= 11
    ) {
      hasFirstCondition = true;
      sql = `${sql} WHERE menu_type = ?`;
      params.push(parseInt(menuType, 10));
    }

    if (
      deposit !== undefined &&
      (parseInt(deposit, 10) === 0 || parseInt(deposit, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE deposit = ?`;
      } else {
        sql = `${sql} AND deposit = ?`;
      }

      params.push(parseInt(deposit, 10));
    }

    if (
      parking !== undefined &&
      (parseInt(parking, 10) === 0 || parseInt(parking, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE parking = ?`;
      } else {
        sql = `${sql} AND parking = ?`;
      }

      params.push(parseInt(parking, 10));
    }

    if (
      delivery !== undefined &&
      (parseInt(delivery, 10) === 0 || parseInt(delivery, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE delivery = ?`;
      } else {
        sql = `${sql} AND delivery = ?`;
      }

      params.push(parseInt(delivery, 10));
    }

    if (latitude !== undefined) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE ST_X(position) >= ?`;
      } else {
        sql = `${sql} AND ST_X(position) >= ?`;
      }
      params.push(latitude);
    }

    if (longitude !== undefined) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE ST_Y(position) >= ?`;
      } else {
        sql = `${sql} AND ST_Y(position) >= ?`;
      }
      params.push(longitude);
    }

    if (!hasFirstCondition) {
      res.json({ code: -1, message: 'Please give at least one condition' });

      return;
    }
    console.log('MULTIPLE');
  } else if (parseInt(queryType, 10) === MULTIPLE_QUERY_OR) {
    // AND condition
    let hasFirstCondition = false;
    if (
      menuType !== undefined &&
      parseInt(menuType, 10) >= 0 &&
      parseInt(menuType, 10) <= 11
    ) {
      hasFirstCondition = true;
      sql = `${sql} WHERE menu_type = ?`;
      params.push(parseInt(menuType, 10));
    }

    if (
      deposit !== undefined &&
      (parseInt(deposit, 10) === 0 || parseInt(deposit, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE deposit = ?`;
      } else {
        sql = `${sql} OR deposit = ?`;
      }

      params.push(parseInt(deposit, 10));
    }

    if (
      parking !== undefined &&
      (parseInt(parking, 10) === 0 || parseInt(parking, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE parking = ?`;
      } else {
        sql = `${sql} OR parking = ?`;
      }

      params.push(parseInt(parking, 10));
    }

    if (
      delivery !== undefined &&
      (parseInt(delivery, 10) === 0 || parseInt(delivery, 10) === 1)
    ) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE delivery = ?`;
      } else {
        sql = `${sql} OR delivery = ?`;
      }

      params.push(parseInt(delivery, 10));
    }

    if (latitude !== undefined) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE ST_X(position) >= ?`;
      } else {
        sql = `${sql} OR ST_X(position) >= ?`;
      }
      params.push(latitude);
    }

    if (longitude !== undefined) {
      if (!hasFirstCondition) {
        hasFirstCondition = true;
        sql = `${sql} WHERE ST_Y(position) >= ?`;
      } else {
        sql = `${sql} OR ST_Y(position) >= ?`;
      }
      params.push(longitude);
    }

    if (!hasFirstCondition) {
      res.json({ code: -1, message: 'Please give at least one condition' });

      return;
    }
  } else if (parseInt(queryType, 10) === MULTIPLE_QUERY_TIME) {
    console.log(queryType);
  } else {
    res.json({ code: -1, message: 'Please give valid query type' });

    return;
  }
  // console.log(req);
  // console.log(res);
  const { mysql } = req;
  console.log(sql);
  console.log(params);

  try {
    sql = `${sql} limit ${limit} offset ${offset}`;
    const result = await mysql.query(sql, params);

    res.json({ code: 0, data: result });
  } catch (err) {
    res.json({ code: -1, message: `${err}` });
  }
};

const importRestaurant = async (req, res) => {
  const { mysql } = req;

  const result = fs.readFileSync('./test_data.csv');
  const lineArr = result.toString().split('\n');
  const insertPromise = Promise.map(
    lineArr,
    async (line, index) => {
      const data = line.split(',');
      let parking = 0;
      let menuType = 0;
      let deposit = 0;
      let michelinStar = 1;
      let delivery = 0;
      let sunFrom = -1;
      let sunTo = -1;
      let monFrom = -1;
      let monTo = -1;
      let tueFrom = -1;
      let tueTo = -1;
      let wedFrom = -1;
      let wedTo = -1;
      let thurFrom = -1;
      let thurTo = -1;
      let friFrom = -1;
      let friTo = -1;
      let satFrom = -1;
      let satTo = -1;
      // console.log(data);
      if (index === 0 || data[0] === '') {
        return 1;
      }

      if (data[1].trim() !== 'Closed') {
        const trimString = data[1].trim();
        const timeRange = trimString.split('-');
        if (timeRange[0].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: sunFrom, timeTo: sunTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: sunFrom, timeTo: sunTo } = timeToInt(data[1].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: sunFrom, timeTo: sunTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: sunFrom, timeTo: sunTo } = timeToInt(data[1].trim()));
        }
      }

      if (data[2].trim() !== 'Closed') {
        const trimString = data[2].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: monFrom, timeTo: monTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: monFrom, timeTo: monTo } = timeToInt(data[2].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: monFrom, timeTo: monTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: monFrom, timeTo: monTo } = timeToInt(data[2].trim()));
        }
      }

      if (data[3].trim() !== 'Closed') {
        const trimString = data[3].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: tueFrom, timeTo: tueTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: tueFrom, timeTo: tueTo } = timeToInt(data[3].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: tueFrom, timeTo: tueTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: tueFrom, timeTo: tueTo } = timeToInt(data[3].trim()));
        }
      }

      if (data[4].trim() !== 'Closed') {
        const trimString = data[4].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: wedFrom, timeTo: wedTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: wedFrom, timeTo: wedTo } = timeToInt(data[4].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: wedFrom, timeTo: wedTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: wedFrom, timeTo: wedTo } = timeToInt(data[4].trim()));
        }
      }

      if (data[5].trim() !== 'Closed') {
        const trimString = data[5].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: thurFrom, timeTo: thurTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: thurFrom, timeTo: thurTo } = timeToInt(data[5].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: thurFrom, timeTo: thurTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: thurFrom, timeTo: thurTo } = timeToInt(data[5].trim()));
        }
      }
      if (data[6].trim() !== 'Closed') {
        const trimString = data[6].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: friFrom, timeTo: friTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: friFrom, timeTo: friTo } = timeToInt(data[6].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: friFrom, timeTo: friTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: friFrom, timeTo: friTo } = timeToInt(data[6].trim()));
        }
      }
      if (data[7].trim() !== 'Closed') {
        const trimString = data[7].trim();
        const timeRange = trimString.split('-');
        if (timeRange[1].length < 5) {
          const timeString = `${trimString.substring(
            0,
            2
          )}:00${trimString.substring(2, trimString.length)}`;
          ({ timeFrom: satFrom, timeTo: satTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: satFrom, timeTo: satTo } = timeToInt(data[7].trim()));
        }

        if (timeRange[1].length < 5) {
          const timeString = `${trimString}:00}`;
          ({ timeFrom: satFrom, timeTo: satTo } = timeToInt(timeString));
        } else {
          ({ timeFrom: satFrom, timeTo: satTo } = timeToInt(data[7].trim()));
        }
      }

      if (data[8].trim() === '無菜單') {
        menuType = 0;
      } else if (data[8].trim() === '傳統') {
        menuType = 1;
      } else if (data[8].trim() === '甜不辣') {
        menuType = 2;
      } else if (data[8].trim() === '丼飯') {
        menuType = 3;
      } else if (data[8].trim() === '鐵板燒') {
        menuType = 4;
      } else if (data[8].trim() === '割烹') {
        menuType = 5;
      } else if (data[8].trim() === '新創') {
        menuType = 6;
      } else if (data[8].trim() === '和牛') {
        menuType = 7;
      } else if (data[8].trim() === '懷石料理') {
        menuType = 8;
      } else if (data[8].trim() === '壽司') {
        menuType = 9;
      } else if (data[8].trim() === '海鮮店') {
        menuType = 10;
      }

      if (data[9].trim() === '無') {
        michelinStar = 0;
      } else if (data[9].trim() === '推薦') {
        michelinStar = 1000;
      } else {
        console.log(data[9]);
        michelinStar = parseInt(data[9].trim(), 10);
      }

      console.log('michilin', michelinStar);
      if (data[10] === '有') {
        parking = 1;
      }

      if (data[11] === '有') {
        delivery = 1;
      }

      if (data[12] === '是') {
        deposit = 1;
      }

      const position = `${data[14].substring(0, 5)}${data[14].substring(
        6,
        data[14].length
      )}`;
      console.log(position);
      const sql = `INSERT INTO restaurant SET restaurant_name = ?, parking = ?, delivery = ?, deposit = ?,
          evaluation = ?, position = ST_PointFromText(?), menu_type = ?, michelin_star = ?,
          sun_from = ?, sun_to = ?, mon_from = ?, mon_to = ?, tue_from = ?, tue_to = ?,
          wed_from = ?, wed_to = ?, thur_from = ?, thur_to = ?, fri_from = ?, fri_to = ?, sat_from = ?, sat_to = ?`;
      const params = [
        data[0],
        parking,
        delivery,
        deposit,
        data[13],
        position,
        menuType,
        michelinStar,
        sunFrom,
        sunTo,
        monFrom,
        monTo,
        tueFrom,
        tueTo,
        wedFrom,
        wedTo,
        thurFrom,
        thurTo,
        friFrom,
        friTo,
        satFrom,
        satTo,
      ];

      console.log(params);
      console.log(sql);
      try {
        const sqlRes = await mysql.query(sql, params);
        console.log(`name: ${data[0]}, id: ${sqlRes.insertId}`);

        return sqlRes;
      } catch (err) {
        // console.log(err);

        return err;
      }
    },
    { concurrency: 1 }
  );

  const insertResult = await Promise.all(insertPromise);
  console.log(insertResult);

  res.json({ code: 0 });
};

export { getRestaurant, importRestaurant };
