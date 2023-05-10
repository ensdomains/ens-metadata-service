const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const templatePath = 'app_template.yaml';
const outputPath = 'app.yaml';

fs.readFile(templatePath, 'utf8', (err, content) => {
  if (err) {
    console.error('Error reading app_template.yaml:', err);
    return;
  }

  const vpcAccessConnector = process.env.VPC_ACCESS_CONNECTOR;

  let updatedContent = content;
  console.log('content', content);
  if (!vpcAccessConnector) {
    console.warn('VPC_ACCESS_CONNECTOR not set in .env file');
    updatedContent = content.replace(
      `\n# remove this module if VPC Access Connector is not needed on your setup\nvpc_access_connector:\n  name: {VPC_ACCESS_CONNECTOR}\n`,
      ''
    );
  } else {
    updatedContent = content.replace(
      '{VPC_ACCESS_CONNECTOR}',
      vpcAccessConnector
    );
  }

  fs.writeFile(outputPath, updatedContent, (err) => {
    if (err) {
      console.error('Error writing app.yaml:', err);
      return;
    }

    console.log('app.yaml generated successfully.');
  });
});
