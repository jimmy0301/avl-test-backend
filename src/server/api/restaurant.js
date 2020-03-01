const SINGLE = 0;
const MULTIPLE = 1;

const getRestaurant = async (req, res) => {
  const { filterType } = req.query;

  if (filterType === SINGLE) {
    console.log('SINGLE');
  } else if (filterType === MULTIPLE) {
    console.log('MUTIPLE');
  }
  // console.log(req);
  // console.log(res);
  const { mysql } = req;
  const sql = 'SELECT * FROM restaurant';

  try {
    const result = await mysql.query(sql);

    res.json(result);
  } catch (err) {
    res.json({ code: -1, message: `${err}` });
  }
};

export default getRestaurant;
