import aws from 'aws-sdk';

aws.config.update({region:'us-east-2'});

const db = new aws.DynamoDB();

export default db;