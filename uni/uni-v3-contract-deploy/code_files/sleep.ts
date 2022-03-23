/** 
* wait a while
*/
export default function sleep(timeinterval: number) {
    var start = (new Date()).getTime();
    while ((new Date()).getTime() - start < timeinterval) {

        continue;
    }
}
