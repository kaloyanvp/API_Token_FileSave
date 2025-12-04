const { Result, Query } = require('pg');
const pool = require('../db');
const tokenDb = require('../tokendb');
const { response } = require('express');
const jwt = require('jsonwebtoken');
const { SECRET } = require('./auth');
const fs = require('fs');
const path = require('path');
const UPLOAD_DIR = path.join(__dirname, '../uploaded_files');
const crypto = require("crypto");
const tokenDbService = require("../services/tokenDbService");
const { error } = require('console');
const timeToExpire = "180d";

const postJsonData = async (req, res) => {
    try {
        const data = req.body.data;
        const tableName = "tovaritelnici";
        if (!data || !Array.isArray(data)) {
            return res.status(400).json({
                success: false,
                message: 'Невалидни данни. Очаква се масив от обекти.'
            });
        }

        if (data.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Празен масив от данни'
            });
        }
        console.log(`Received ${data.length} rows for insertion`);
        const result = await bulkInsert(tableName, data, 100);

        res.json({
            success: true,
            message: 'Данните са успешно вмъкнати',
            stats: {
                receivedRows: data.length,
                insertedRows: result.inserted
            }
        });

    } catch (error) {
        console.error('Грешка при вмъкване на данни:', error);
        res.status(500).json({
            success: false,
            message: 'Грешка при вмъкване на данни: ' + error.message
        });
    }
}

if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

async function bulkInsert(tableName, data, batchSize = 100) {
    if (!data || data.length === 0) {
        return { inserted: 0 };
    }

    // const columns = Object.keys(data[0]);
    const columns = getTables();
    // const values = data.map(row => columns.map(col => {return row[col.toUpperCase()];}));   OLD NON CHATGPT
    const values = data.map(row => columns.map(col => normalizeValue(row[col.toUpperCase()], col)));

    // console.log(values);
    let inserted = 0;
    const totalBatches = Math.ceil(values.length / batchSize);
    // console.log(totalBatches);
    // console.log(values.length);

    for (let i = 0; i < totalBatches; i++) {
        const batch = values.slice(i * batchSize, (i + 1) * batchSize);

        // const placeholders1 = batch.map(() => `(${columns.map((_, i) => `$${i * 4 + 1}`).join(',')})`).join(',');
        // const placeholders = batch.map((_, i) => `($${i * 4 + 1}, $${i * 4 + 2}, $${i * 4 + 3},$${i * 4 + 4})`).join(', ');
        //($${i * 4 + j}
        let placeholder = '';
        const columncount = 102;
        for (let k = 0; k < batch.length; k++) {
            placeholder += "(";
            for (let j = 1; j <= columncount; j++) {
                placeholder += `$${k * columncount + j}`;
                if (j != columncount) {
                    placeholder += ", ";
                }
            }
            if (k < batch.length - 1) {
                placeholder += '),';
            }
            else {
                placeholder += ")";
            }
        }

        const sql = `INSERT INTO ${tableName} (${columns.join(',')}) VALUES ${placeholder}`;
        const flatValues = batch.flat();
        // console.log(sql);
        // c
        try {
            const result = await pool.query(sql, flatValues);
            inserted += result.affectedRows;
            // console.log(`Batch ${i + 1}/${totalBatches}: Inserted ${result.affectedRows} rows`);
        } catch (error) {
            console.error(`Error in batch ${i + 1}:`, error);
            throw error;
        }
    }
    return { inserted };
}

function normalizeValue(value, columnName) {
    if (value === "" || value === undefined) {
        return null;
    }

    // Optional: convert string numbers like "123" to number for numeric fields
    const numericColumns = [
        "TID", "GRUPOVA", "TOVARITELNICA", "SITEID_A", "SITEID_B",
        "MICRORAION", "PLATEC", "PARENT_PLATEC", "PLATEC_DOGOVOR",
        "NAL_PLATEJ", "ZASTRAHOVKA", "RC", "RC_VZIMANE", "KORTYPE",
        "GROUP", "SUBGROUP", "CLIENT_TEGLO", "PROTOKOL", "VURNAT_ORDER", "RAZHODORDER"
    ];

    const smallIntsColumns = [
        "RETURN_RECEIPT", "RETURN_DOC", "CHUPLIVO", "POST_MONEY_TRANSFER", "KORTYPE",
        "CHECK_BEFORE_PAY", "CLIENT_TEGLO", "VURNAT_ORDER"
    ]

    const decimalColumns = [
        "TEGLO", "TAX_USLUGA", "TAX_SR", "TAX_FIXCH", "TAX_RET_D", "TAX_RET_R",
        "TAX_NP", "TAX_INS", "TAX_FUEL", "KOREKCIA", "STOINOST",
        "T_DEBIT", "T_CREDIT", "STOINOST_TOTAL", "CUSTOM_TEGLO",
        "NP_BEFORE_PREVALUTIRANE", "INV_BEFORE_PREVALUTIRANE", "TAX_INV_BEFORE_PREVALUTIRANE"
    ];

    const timestampColumns = [
        "CREATED", "DATA_PORUCHKA", "DATA_DOSTAVKA", "IZPLATENODATA"
    ];

    // Convert numeric-looking strings to numbers
    if (numericColumns.includes(columnName.toUpperCase())) {
        if (isNaN(value)) {
            return value === "" ? null : parseInt(value.replace(/\s+/g, ""), 10);
        } else {
            return value === "" ? null : Number(value);
        }

    }

    if (smallIntsColumns.includes(columnName.toUpperCase())) {
        return value === "" ? 0 : Number(value);
    }

    // Convert decimal-looking strings to numbers
    if (decimalColumns.includes(columnName.toUpperCase())) {
        return value === "" ? null : parseFloat(value);
    }

    // Convert date/time if needed
    if (timestampColumns.includes(columnName.toUpperCase())) {
        if (typeof value === "string" && value.includes(".")) {
            // Convert 'DD.MM.YYYY HH:MM' -> 'YYYY-MM-DD HH:MM:00'
            const [datePart, timePart] = value.split(" ");
            if (datePart && timePart) {
                const [d, m, y] = datePart.split(".");
                return `${y}-${m}-${d} ${timePart}:00`;
            }
        }
        return value || null;
    }

    // Default: return as-is (for text columns)
    return value;
}

function getTables() {
    const fields = ["tid", "grupova", "tovaritelnica", "real_name", "created", "sender", "country_a", "city_a", "siteid_a", "pk_a", "street_a", "street_no_a", "block_a", "entrance_a", "floor_a", "apartment_a", "additional_info_a", "phone_a", "cperson_a", "k_poruchka", "data_poruchka", "service", "name", "brpaketi", "teglo", "content", "opakovka", "zasmetka", "fixchas", "nal_platej", "zastrahovka", "return_receipt", "return_doc", "chuplivo", "sname", "receiver", "country_b", "city_b", "siteid_b", "pk_b", "street_b", "street_no_b", "block_b", "entrance_b", "floor_b", "apartment_b", "additional_info_b", "phone_b", "cperson_b", "k_dostavka", "data_dostavka", "platec_name", "platec", "platec_dogovor", "parent_platec", "spedy2", "spedy", "delivery_subcontractor", "post_money_transfer", "client_ref1", "client_ref2", "dopoiskvane", "rc_vzimane", "rc", "raion", "microraion", "mynotes", "ret_red", "poluchil", "invoicenum", "kb", "tax_usluga", "tax_sr", "tax_fixch", "tax_ret_d", "tax_ret_r", "tax_np", "tax_ins", "tax_fuel", "korekcia", "kortype", "stoinost", "t_debit", "t_credit", "stoinost_total", "lice_podatel", "lice_podatel_egn", "np_before_prevalutirane", "inv_before_prevalutirane", "tax_inv_before_prevalutirane", "razhodorder", "izplatenodata", "check_before_pay", "\"GROUP\"", "subgroup", "eoid", "client_teglo", "custom_teglo", "protokol", "vurnat_order", "type_delivery", "poruchka"];
    return fields;
}


const getOrCreateToken = async function (req, res, next) {
    try {
        const { accessKey } = req.query;

        if (!accessKey || accessKey !== 'super-access') {
            return res.status(401).json({ message: 'Невалиден достъп' });
        }

        // Get existing token(s) from DB
        const tokenResult = await tokenDbService.getToken();

        let tokenString;

        if (tokenResult.rows.rowCount === 0) {
            // No token → create new one
            const tokenString = jwt.sign({ accessKey }, SECRET, { expiresIn: timeToExpire });

            const createResult = await tokenDbService.createToken(tokenString);

            if (createResult.rows.rowCount === 1) {
                return res.json({ message: "Токена е създаден успешно" });
            } else {
                return res.status(500).json({ error: "Грешка при създаване на Токена" });
            }
        } else {
            // Token exists → use it
            tokenString = tokenResult.rows.rows[0].token;
            // return res.json({ message: "Токена вече съществува" });
        }

        // Optional: verify token if needed
        
        jwt.verify(tokenString, SECRET, (err, decoded) => {
            if (err) {
                
                const tokenString = jwt.sign({ accessKey }, SECRET, { expiresIn: timeToExpire });
                tokenDbService.updateToken(tokenString);
                
                res.json({message : "Токена не е валиден"});
            }
            else {
                console.log(decoded);
                res.json({ message: "Токена е валиден" })
            }
        });

    } catch (error) {
        console.error("Грешен Токен", error);
        return res.status(500).json({ error: "Server error" });
    }
};

// Примерен endpoint: /api/token?accessKey=super-access
// const generateToken = (req, res) => {
//     const { accessKey } = req.query;

//     if (!accessKey || accessKey !== 'super-access') {
//         return res.status(401).json({ message: 'Невалиден достъп' });
//     }

//     const token = jwt.sign({ accessKey }, SECRET, { expiresIn: '180d' });

//     res.json({
//         message: 'Токенът е генериран успешно'
//     });
// };


// const getOrCreateToken = async function (req, res, next) {
//     try {
//         let token = await tokenDbService.getall();
//         const { accessKey } = req.query;
//         // console.log(token);
//         if (token.rows.rowCount === 0) {
//             let token = jwt.sign({ accessKey }, SECRET, { expiresIn: '180d' });
//             const result = await tokenDbService.create(token);
//             // console.log(result)
//             if (result.rows.rowCount === 1) {
//                 res.json({ message: "Токена е създаден успешно" });
//             } else {
//                 res.json({ error: "Грешка при създаване на Токена" });
//             }
//         }
//         console.log(token);
//         jwt.verify(token, SECRET, { algorithms: ['RS256'] }, (err, decoded) => {
//             if (err) {
//                 console.error("Token validation failed:", err);
//                 return;
//             }
//             console.log("Token is valid:", decoded);
//         })

//         // console.log(validateJWT);
//     } catch (error) {
//         console.error("Грешен Токен", error);
//     }

//     // if (result.rows.length > 0) {
//     //     return { token: result.rows[0].token, status: "valid" };
//     // }

//     // // 2. Remove old tokens
//     // await tokenDb.query("DELETE FROM api_tokens");

//     // // 3. Create new token
//     // const { accessKey } = req.query;

//     // if (!accessKey || accessKey !== 'super-access') {
//     //     return res.status(401).json({ message: 'Невалиден достъп' });
//     // }
//     // const token = jwt.sign({ accessKey }, SECRET, { expiresIn: '180d' });

//     // // 4. Store 6-month expiration
//     // await tokenDb.query(
//     //     `INSERT INTO api_tokens (token, created_at)
//     //      VALUES ($1, NOW() + INTERVAL '6 months')`,
//     //     [newToken]
//     // );
//     // return { message: 'Токенът е генериран успешно' };
// }

module.exports = {
    postJsonData,
    getOrCreateToken,
    // getOrCreateToken
};