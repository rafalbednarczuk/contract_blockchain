import {Address} from "@ton/core";

function convertToFriendly() {
    console.log("convert starts")
    const address = Address.parseRaw("0:a3935861f79daf59a13d6d182e1640210c02f98e3df18fda74b8f5ab141abf18")
    console.log("friendlyAddress:" + address.toString())
    console.log("rawAddress:" + address.toRawString())
}

convertToFriendly();