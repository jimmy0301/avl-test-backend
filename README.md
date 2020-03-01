# Search Restaurant

Import some restaurant data and provide the API to search them with some conditions 

## API Documentation
----
  Returns json data about some restaurants.

### URL

  `/restaurants`

### Method

  `GET`
  
### URL Params
- **query_type** - 查詢方式, 0:單一條件查詢, 1:多條件做 AND 查詢, 2:多條件做 OR 查詢, 3:查詢餐廳營業時間, 必填欄位
- **menu_type** - 店家類型, 0:無菜單, 1:傳統, 2:甜不辣, 3:丼飯, 4:鐵板燒, 5:割烹, 6:新創, 8:和牛, 9:懷石料理,10:壽司, 11:海鮮店
- **deposit** - 是否需要預付訂金, 0:否, 1:是
- **parking** - 有無停車位, 0:無, 1:有
- **delivery** - 有無外送, 0:無, 1:有
- **latitude** - 店家所在地圖的緯度,浮點數
- **longitude** - 店家所在地圖的經度,浮點數
- **weekday** - 星期幾, 0:星期天, 1:星期一, 2:星期二, 3:星期三, 4:星期四, 5:星期五, 6:星期六
- **michilin_start** - 米其林星, 0:無, 1000:推薦, 1:一星, 2:二星, 3:三星
- **time_from** - 營業開始時間, 格式為 HH:mm, example: 15:30
- **time_to** - 營業結束時間, 格式為 HH:mm, example: 15:30
- **offset** - 從第幾筆開始回傳資料, 最小為 0 即第一筆, 預設為 0
- **limit** - 一次回傳幾筆, 預設為 10 筆

### Success Response:

  * **Code:** 200 <br />
    **Content:**
       ```json
        {"code":0,"totalCount":42,"data":[{"restaurant_id":1,"restaurant_name":"德壽司","parking":1,"delivery":0,"deposit":1,"evaluation":4.86,"longitude":-8.45615794798,"latitude":29.8376295469,"menu_type":0,"michelin_star":0,"sunday":"05:30-02:00","monday":"05:30-02:00","tuesday":"05:30-02:00","wednesday":"05:30-02:00","thursday":"05:30-02:00","friday":"05:30-02:00","saturday":"05:30-02:00"}]}
       ```
  - **code** - code 是 0 代表資料回傳正常, code 不是 0, 代表異常
 
### Error Response:

  * **Code:** 404 NOT FOUND <br />
    **Content:**
      ```json
        {"code":-1, "message": "There is no restaurant"}
      ```
### Demo URL:
`http://ec2-13-113-153-227.ap-northeast-1.compute.amazonaws.com/`
### Sample Call:
  `GET /restaurants?query_type=0&menu_type=10` <br />
OR   <br />
  `GET /restaurants?query_type=1&weekday=0&menu_type=10&parking=1&delivery=1&deposit=1`   <br />
OR   <br />
  `GET /restaurants?query_type=3&weekday=0&time_from=09:30&time_to=22:00`

## Development

Executing followning instruction on CLI and the service will launch

```console
$ npm install
$ npm run start:dev
```
