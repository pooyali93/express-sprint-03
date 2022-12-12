// Imports -----------------------------
import express from "express";
import database from "./database.js";
import cors from 'cors';
// Configure express app ---------------

const app = new express();
app.use(express.json());
app.use(express.urlencoded({extended:true}));
// Configure middleware ----------------
app.use(function (req, res, next) {
   
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
  });
  
 app.use(cors({ origin: '*' }));
  
// Controllers -------------------------
const buildSetFields = (fields) => fields.reduce((setSQL, field, index) => 
  setSQL +`${field}=:${field} ` + ((index === fields.length - 1) ? '' : ', '), 'SET ');


  const buildBookingsDeleteSql = (id) => {
    let table = 'bookings';
    return `DELETE FROM ${table} WHERE BookingId=${id}`;
  };

// const buildBookingsUpdateSql = () => {
//   let table = `bookings`;
//   let mutableFields = ['VehicleId', 'CustomerId', 'SalesId', 'DateBooked'];

//   return `UPDATE ${table} ` + buildSetFields(mutableFields) + ` WHERE BookingId=:BookingId `;

// };

const buildBookingsInsertSql = (record) => {
  let table = `bookings`;
  // let mutableFields = ['VehicleId', 'SalesId', 'CustomerId', 'DateBooked'];
  // console.log(buildSetFields(mutableFields), "build set fields");
  // return `INSERT INTO ${table} ` + buildSetFields(mutableFields) ;
  return `INSERT INTO ${table} SET
          VehicleId="${record['VehicleId']}",
          CustomerId="${record['CustomerId']}", 
          SalesId="${record['SalesId']}",
          DateBooked="${record['DateBooked']}"`
};

const buildBookingsSelectSql = (whereField, id) => {
    let table = `(((bookings LEFT JOIN vehicles ON bookings.VehicleId = vehicles.VehicleId) 
      LEFT JOIN users AS customers ON bookings.CustomerId = customers.UserId) 
      LEFT JOIN users AS salesperson ON bookings.SalesId = salesperson.UserId)`;
    let fields = "BookingId,vehicles.VehicleId, VehicleMake, VehicleModel,VehicleColour, VehicleYear,VehiclePrice, DateBooked, bookings.SalesId AS SalesId, CONCAT(salesperson.userFirstName,' ', salesperson.userSurname) AS Salesperson, bookings.CustomerId AS UserId, CONCAT(customers.userFirstName,' ', customers.userSurname) AS Customer";
    let sql = `SELECT ${fields} FROM ${table}`;
    if (id) sql += ` WHERE ${whereField}=${id}`;
    return sql;
  };


  // Build Vehicle Select Sql 
  const buildVehiclesSelectSql = () => {
    let table = 'vehicles';
    let fields = ['VehicleId, VehicleMake, VehicleModel, VehicleYear,VehiclePrice'];
    let sql = `SELECT ${fields} FROM ${table}`;
    return sql;
  };
//   const updateBookings = async (sql, id, record) => {
//     try {
//         const status = await database.query(sql, {...record, BookingId: id});
//         if (status[0].affectedRows === 0)
//       return { isSuccess: false, result: null, message: 'Failed to update record: no rows affected' };

//     const recoverRecordSql = buildBookingsSelectSql(id, null);

//     const { isSuccess, result, message } = await read(recoverRecordSql);
        
//     return isSuccess
//       ? { isSuccess: true, result: result, message: 'Record successfully recovered' }
//       : { isSuccess: false, result: null, message: `Failed to recover the updated record: ${message}` };
//   }
//   catch (error) {
//     return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
//   }
// };

  
  const createBookings = async (sql, record) => {
    try {
        const status = await database.query(sql,record);
        const recoverRecordSql = buildBookingsSelectSql(status[0].insertId);
        const {isSuccess, result, message} = await read(recoverRecordSql);

        return isSuccess
          ? { isSuccess: true, result: result, message: 'Record(s) successfully recovered' }
          : { isSuccess: false, result: null, message: `Failed to recover the inserted record: ${message}`};
      }
      catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
      }
    };

  const read = async (sql) => {
    try {
        const [result] = await database.query(sql);
        return (result.length === 0)
          ? { isSuccess: false, result: null, message: 'No record(s) found' }
          : { isSuccess: true, result: result, message: 'Record(s) successfully recovered' };
      }
      catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
      }
    };
    const deleteBookings = async (sql, id) => {
      try {
        const status = await database.query(sql,{ BookingID: id });
        
        return status[0].affectedRows === 0
          ? { isSuccess: false, result: null, message: `Failed to delete record ${id}` }
          : { isSuccess: true, result: null, message: 'Record successfully deleted' };
      }
      catch (error) {
        return { isSuccess: false, result: null, message: `Failed to execute query: ${error.message}` };
      }
    };

    const postBookingsController = async(req, res) => {
      // Validate Request 
      // Data Access 
      const sql = buildBookingsInsertSql(req.body);
      console.log(sql, "build insert syntax sql ");
      const { isSuccess, result, message: accessMessage } = await createBookings(sql);
      console.log(req.body, "req body insert sql ");
      if (!isSuccess) return res.status(400).json({ message: accessMessage });
    
      // Response to request
      res.status(201).json(result);
    };
  


  const buildUsersSelectSql = (whereField, id) => {
    let table = 'users LEFT JOIN UserTypes ON userUserTypeId=UserTypeID';
    let fields = ['UserId, userFirstName, userSurname, userPhoneNumber, userTypeName'];
   
    let sql = `SELECT ${fields} FROM ${table}`;
    if (id) sql += ` WHERE ${whereField}=${id}`;
    
    return sql;
  };

  const bookingsController = async(res, whereField, id) => {

    // Data Access 
    const sql = buildBookingsSelectSql(whereField, id );
    const { isSuccess, result, message: accessMessage } = await read(sql);
    if (!isSuccess) return res.status(400).json({ message: accessMessage });
  
    // Response to request
    res.status(200).json(result);
  };

  // const putBookingsController = async(req, res) => {
  //   // Validate Request 
  //   const id = req.params.id;
  //   const record = req.body;
  //   // Data Access 
  //   const sql = buildBookingsUpdateSql();
  //   const { isSuccess, result, message: accessMessage } = await updateBookings(sql, id, record);
  //   if (!isSuccess) return res.status(404).json({ message: accessMessage });
  
  //   // Response to request
  //   res.status(200).json(result);
  // };


  const deleteBookingsController = async (req, res) => {
    // Validate request
    const id = req.params.id;
  
    // Access data
    const sql = buildBookingsDeleteSql();
    const { isSuccess, result, message: accessorMessage } = await deleteBookings(sql, id);
    if (!isSuccess) return res.status(400).json({ message: accessorMessage });
    
    // Response to request
    res.status(204).json({ message: accessorMessage });
  };
 

  // Vehicle Controller 
  const vehiclesController = async(res) => {
    // Data Access 
    const sql = buildVehiclesSelectSql();
    const { isSuccess, result, message: accessMessage } = await read(sql);
    if (!isSuccess) return res.status(400).json({ message: accessMessage });
  
    // Response to request
    res.status(200).json(result);
  };

    // Users Controller 
const usersController = async(res, whereField, id) => {
  
    // Data Access 
    const sql = buildUsersSelectSql(whereField, id );
    const { isSuccess, result, message: accessMessage } = await read(sql);
    if (!isSuccess) return res.status(400).json({ message: accessMessage });
  
    // Response to request
    res.status(200).json(result);
  };


// Endpoints ---------------------------
app.get('/api/bookings', (req, res) =>  bookingsController(res, null, null));
app.get('/api/bookings/:id(\\d+)',(req, res) =>  bookingsController(res, "BookingId",  req.params.id));
app.get('/api/bookings/sales/:id', (req, res) =>  bookingsController(res,"SalesId",  req.params.id));
app.get('/api/bookings/users/:id', (req, res) =>  bookingsController(res,"CustomerId",  req.params.id));
app.get('/api/bookings/customers/:id', (req, res) =>  bookingsController(res,"CustomerId",  req.params.id));


// POST 
app.post('/api/bookings', postBookingsController);

// // PUT 
// app.put('/api/bookings/:id', putBookingsController);


app.delete('/api/bookings/:id', deleteBookingsController);

// Vehicles 
app.get('/api/vehicles', (req, res) =>  vehiclesController(res, null, null));
app.get('/api/vehicles/:id(\\d+)',(req, res) =>  vehiclesController(res, "BookingId",  req.params.id));

// Users
const SALESPERSON = 1;
const CUSTOMERS = 2;
app.get('/api/users', (req, res) => usersController(res, null, null, false));
app.get('/api/users/:id(\\d+)', (req, res) => usersController(res, "UserId", req.params.id, false));
app.get('/api/users/customers', (req, res) => usersController(res, CUSTOMERS, req.params.id, false));
app.get('/api/users/sales', (req, res) => usersController(res, SALESPERSON, req.params.id, false));

app.get('/api/users/customers/:id', (req, res) => usersController(res,CUSTOMERS, req.params.id, false));
app.get('/api/users/sales/:id', (req, res) => usersController(res,SALESPERSON, req.params.id, false));
// Start server ------------------------
const PORT = process.env.PORT || 5000;
app.listen(PORT,() => console.log(`Server started on port ${PORT}`));