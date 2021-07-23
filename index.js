const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

const dynamoDB = new AWS.DynamoDB.DocumentClient();
const tableName = 'products';
const healthPath = '/health';
const productPath = '/product';
const productsPath = '/products';

exports.handler = async function (event) {
    let _response;

    switch (true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            _response = buildResponse(200);
            break;
        case event.httpMethod === 'GET' && event.path === productPath:
            _response = await getProductID(event.queryStringParameters.id);
            break;
        case event.httpMethod === 'GET' && event.path === productsPath:
            _response = await getAllProducts();
            break;
        default:
            _response = buildResponse(404, '404 Not Found');
    }
    return _response;
};

async function getProductID(id) {
    const params = {
        TableName: tableName,
        Key: {
            'id': id
        }
    };

    return await dynamoDB.get(params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error(error);
    });
}

async function getAllProducts() {
    const params = {
        TableName: tableName
    };

    const allProducts = await searchData(params, []);

    const body = {
        products: allProducts
    };

    return buildResponse(200, body);
}

async function searchData(params, items) {
    try {
        const data = await dynamoDB.scan(params).promise();

        items = items.concat(data.Items);

        if (data.LastEvaluatedKey) {
            params.ExclusiveStartkey = data.LastEvaluatedKey;
            return await searchData(params, items);
        }

        return items;
    } catch (error) {
        console.error(error);
    }
}

function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}