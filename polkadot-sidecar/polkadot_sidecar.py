from flask import Flask, escape, request
import requests
import time

application = Flask(__name__)

@application.route('/is_synced')
def sync_checker():
    try:
        system_health = requests.post('http://127.0.0.1:9933', json={"id":1, "jsonrpc":"2.0", "method": "system_health", "params":[]}).json()["result"]

        if system_health["isSyncing"]:
            err = "Still syncing", 500
            print(err)
            return err

        current_block_height = requests.post('http://127.0.0.1:9933', json={"id":1, "jsonrpc":"2.0", "method": "system_syncState", "params":[]}).json()["result"]["currentBlock"]

        current_block_hash = requests.post('http://127.0.0.1:9933', json={"id":1, "jsonrpc":"2.0", "method": "chain_getBlockHash", "params":[current_block_height]}).json()["result"]
        current_block = requests.post('http://127.0.0.1:9933', json={"id":1, "jsonrpc":"2.0", "method": "chain_getBlock", "params":[current_block_hash]}).json()["result"]["block"]
    except requests.exceptions.RequestException as e:
        err = "Could not connect to node, %s" % repr(e), 500
        print(err)
        return err

    timestamp_extrinsic = current_block["extrinsics"][0].split("0x")[1]
    # take bytes from fourth to end
    timestamp = bytes.fromhex(timestamp_extrinsic[10:])
    # bytes are little endian
    timestamp_int = int(int.from_bytes(timestamp, "little")/1000)
    time_now = int(time.time())
    last_block_age = time_now - timestamp_int

    PROBLEM_DELAY = 180
    if last_block_age > PROBLEM_DELAY:
        err = f"last block is more than {PROBLEM_DELAY} seconds old"
        print(err)
        return err
    return "chain is synced"



# timestamp is encoded with scale codec
# https://substrate.dev/docs/en/knowledgebase/advanced/codec
# from riot discussion
# https://matrix.to/#/!LhjZccBOqFNYKLdmbb:polkadot.builders/$1589987466245024AEJsU:matrix.org?via=matrix.parity.io&via=matrix.org&via=corepaper.org

#
#nuevax
#it is still unclear to me, the second half of the string always begins with 0b, which indicates an integer, however it does not have the two bits  after that indicative for one of the integer formats from the Codec definition.
#Jaco
#0x0b = 0b1011 - 11 (lower 2 bits as per spec) indicates 4 bytes mode, so number of byte following is 4 (as indicated) + 0b10 bytes - so total of 6 bytes.
#nuevax
#I tried all kinds of 6 bytes hex to dec, but to me it seems the 10/13 digit dec timestamp cannot be generated out of 6 bytes even though it says compact.
#nuevax
#Message deleted
#nuevax
#0x280402000bb1f14e327201 this is the string from the extrinsic, 0bb1f14e327201 the second half, after 0b none of the codec specifications.
#Jaco
#:Looks valid, manually decoded it,
#
#1
#2
#console.log(new Date(1589981934001))
#Wed May 20 2020 15:38:54 GMT+0200 (Central European Summer Time)
