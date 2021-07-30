const AWS = require('aws-sdk');

AWS.config.update({
    region: 'us-east-1'
});

// Instance of DynamoDB
const dynamoDB = new AWS.DynamoDB.DocumentClient();

// Table Name DynamoDB
const tableName = 'products';

// Resources Path GatwayAPI
const healthPath = '/health';
const productPath = '/product';
const productsPath = '/products';

// Handler API
exports.handler = async function (event) {
    let _response;
    console.log('Iniciando Consulta...')

    switch (true) {
        case event.httpMethod === 'GET' && event.path === healthPath:
            _response = buildResponse(200, 'API is ok!');
            break;
        case event.httpMethod === 'GET' && event.path === productPath:
            _response = await getProduct(event.queryStringParameters.id);
            break;
        case event.httpMethod === 'GET' && event.path === productsPath:
            _response = await getAllProducts();
            break;
        case event.httpMethod === 'POST' && event.path === productPath:
            _response = await createProduct(JSON.parse(event.body));
            break;
        case event.httpMethod === 'PATCH' && event.path === productPath:
            const _requestBody = JSON.parse(event.body);
            _response = await updateProduct(_requestBody.id, _requestBody.updatesKeys);
            break;
        case event.httpMethod === 'DELETE' && event.path === productPath:
            _response = await deleteProduct(JSON.parse(event.body).id);
            break;
        default:
            _response = buildResponse(404, '404 Not Found');
    }

    return _response;
};

// Get Product By Id
async function getProduct(id) {
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

// Get All Products
async function getAllProducts() {
    const _params = {
        TableName: tableName
    };

    const _allProducts = await searchData(_params, []);

    const _body = {
        products: _allProducts
    };

    return buildResponse(200, _body);
}

// Create a New Product
async function createProduct(requestBody) {
    const _params = {
        TableName: tableName,
        Item: requestBody
    };

    return await dynamoDB.put(_params).promise().then(() => {
        const _body = {
            Operation: 'CREATE',
            Message: 'SUCCESS',
            Item: requestBody
        };

        return buildResponse(201, _body);
    }, (error) => {
        console.error(error);
    });
}

// Update a Product By Id
async function updateProduct(id, updatesKeys) {
    const _params = {
        TableName: tableName,
        Key: {
            'id': id
        },
        UpdateExpression: `set nome = :nome, descricao = :descricao, preco = :preco`,
        ExpressionAttributeValues: {
            ':nome': updatesKeys.nome,
            ':descricao': updatesKeys.descricao,
            ':preco': updatesKeys.preco
        },
        ReturnValues: 'UPDATED_NEW'
    };

    console.log("Atualizando Produto...");

    return await dynamoDB.update(_params).promise().then((response) => {
        console.log("UpdateItem succeeded");

        const _body = {
            Operation: 'UPDATE',
            Message: 'SUCCESS',
            UpdatedAttributes: response
        };

        return buildResponse(200, _body);
    }, (error) => {
        console.error(error);

        const _body = {
            Operation: 'UPDATE',
            Message: 'FAILED'
        };

        return buildResponse(400, _body);
    });
}

// Delete a Product By Id
async function deleteProduct(id) {
    const _params = {
        TableName: tableName,
        Key: {
            'id': id
        },
        ReturnValues: 'ALL_OLD'
    };

    return await dynamoDB.delete(_params).promise().then((response) => {
        const _body = {
            Operation: 'DELETE',
            Message: 'SUCCESS',
            Item: response
        };

        return buildResponse(200, _body);
    }, (error) => {
        console.error(error);
    });
}

// Search DynamoDB
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

// Build Response JSON
function buildResponse(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    };
}