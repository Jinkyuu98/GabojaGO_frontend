const fs = require('fs');

try {
    const content = fs.readFileSync('backend_source/openapi.json', 'utf8');
    const data = JSON.parse(content);

    console.log("=== /schedule/list ===");
    const slist = data.paths['/schedule/list'];
    console.log(JSON.stringify(slist, null, 2));

    console.log("=== /schedule/user/list ===");
    const ulist = data.paths['/schedule/user/list'];
    console.log(JSON.stringify(ulist, null, 2));

    console.log("=== Schemas ===");
    const schemas = data.components?.schemas || {};
    const relevant = Object.keys(schemas).filter(k => k.includes('Schedule') || k.includes('User'));

    for (const k of relevant) {
        console.log(`--- ${k} ---`);
        console.log(JSON.stringify(schemas[k], null, 2));
    }
} catch (e) {
    console.error(e);
}
