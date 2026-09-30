const {firebase}=require('./firebase.cjs');
const {openingHours}=require('./opening-hours.cjs');

// No cache: switching OFF must affect the next order and Checkout request.
function createOrderingHours({readSettings=async()=>{
  const document=await firebase().db.collection('dailySettings').doc('ordering').get();
  return document.exists?document.data():{};
}}={}){
  return async(now=new Date())=>{
    let allowOutsideHours=false;
    try{allowOutsideHours=(await readSettings())?.allowOutsideHours===true;}
    catch{/* If settings cannot be read, the normal timetable still applies. */}
    const scheduled=openingHours(now);
    const open=scheduled.open||allowOutsideHours;
    return {...scheduled,scheduledOpen:scheduled.open,allowOutsideHours,open,message:open?'':scheduled.message};
  };
}
module.exports={createOrderingHours};
