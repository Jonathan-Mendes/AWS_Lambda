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
            _response = await getProductID(parseInt(event.queryStringParameters.id));
            break;
        case event.httpMethod === 'GET' && event.path === productsPath:
            _response = await getAllProducts();
            break;
        case event.httpMethod === 'POST' && event.path === productPath:
            _response = await createProduct(JSON.parse(event.body));
            break;
        case event.httpMethod === 'DELETE' && event.path === productPath:
            _response = await deleteProductID(JSON.parse(event.body).id);
            break;
        default:
            _response = buildResponse(404, '404 Not Found');
    }
    return _response;
};

async function getProductID(id) {
    const _params = {
        TableName: tableName,
        Key: {
            'id': id
        }
    };

    return await dynamoDB.get(_params).promise().then((response) => {
        return buildResponse(200, response.Item);
    }, (error) => {
        console.error(error);
    });
}

async function getAllProducts() {
    const _params = {
        TableName: tableName
    };

    const _allProducts = await searchData(_params, []);

    const body = {
        products: _allProducts
    };

    return buildResponse(200, body);
}

async function createProduct(requestBody) {
    const _params = {
        TableName: tableName,
        Item: requestBody
    };

    return await dynamoDB.put(_params).promise().then(() => {
        const body = {
            Operation: 'CREATE',
            Message: 'SUCCESS',
            Item: requestBody
        };

        return buildResponse(201, body);
    }, (error) => {
        console.error(error);
    });
}

async function deleteProductID(id) {
    const _params = {
        TableName: tableName,
        Key: {
            'id': id
        },
        ReturnValues: 'ALL_OLD'
    };

    return await dynamoDB.delete(_params).promise().then((response) => {
        const body = {
            Operation: 'DELETE',
            Message: 'SUCCESS',
            Item: response
        };

        return buildResponse(200, body);
    }, (error) => {
        console.error(error);
    });
}

async function searchData(params, items) {
    try {
        const _data = await dynamoDB.scan(params).promise();

        items = items.concat(_data.Items);

        if (_data.LastEvaluatedKey) {
            params.ExclusiveStartkey = _data.LastEvaluatedKey;
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