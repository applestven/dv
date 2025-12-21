// 等待时间

function delay(time) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            resolve(true);
        }, time);
    });
}

module.exports = {
    delay,
}