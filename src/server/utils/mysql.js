import mysql from 'mysql';

class Mysql {
  constructor(config) {
    this.pool = mysql.createPool(config);
  }

  query(sql, args) {
    return new Promise((resolve, reject) => {
      this.pool.query(sql, args, (err, rows) => {
        if (err) {
          reject(err);
        }

        resolve(rows);
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.pool.end(err => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }
}

export default Mysql;
