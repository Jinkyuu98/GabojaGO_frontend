import fetch from "node-fetch";

async function run() {
    try {
        const listRes = await fetch("http://localhost:8000/schedule/list");
        const listData = await listRes.json();
        console.log("Schedule List:", JSON.stringify(listData, null, 2));

        let targetPk = 1;
        if (listData.schedule_list && listData.schedule_list.length > 0) {
            targetPk = listData.schedule_list[0].iPK;
        }

        console.log(`Fetching locations for iSchedulePK=${targetPk}`);
        const locRes = await fetch(`http://localhost:8000/schedule/location/list?iSchedulePK=${targetPk}`);
        const locData = await locRes.json();
        console.log("Location Data:", JSON.stringify(locData, null, 2));
    } catch (e) {
        console.error("Error:", e.message);
    }
}

run();
