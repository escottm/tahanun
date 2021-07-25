// const express = require( 'express');

import dateString from './datestring.js';
import express from 'express';


const PORT = process.env.PORT || 8080;
const app = express();

import { readTahanun } from './readTahanun.js';


app.get('/', (req, res) => {

	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");

	const { date } = req.query;
        
	//	just about anything can come in as a query parm; make sure it's just a plain old string
	const jDate = JSON.stringify(date??dateString());		// ensures it's a string (good) surrounded by quotes (annoying)
	const useThisDate = jDate.slice(1, jDate.length-1);	// de-quotify 
	
	console.log( `index: arg "${date}" results in "${useThisDate}"`);
	if ( ! /^\d\d\d\d\-\d?\d-\d?\d/.test(useThisDate) )  {		//	That's no date! (Must be yyyy-mm-dd)
		res.status(400).send('Date must be in the format yyyy-mm-dd');
		return
	}

	const dateObj = new Date(useThisDate);

	readTahanun( dateObj )
		.then( calInfo => {
			console.log( `index: ${JSON.stringify(calInfo)}`);
			res.json(calInfo);
		})
		.catch( err => res.status(500).send(`Server error IH: ${err}`))	
});


app.listen(PORT, () => {
	console.log(`ta\u1e25nun is waiting patiently on port ${PORT}`);
});