// Never log coordinates or provider URLs (Google URLs include a private key).
async function reverseAddress(latitude,longitude,{env=process.env,fetcher=fetch}={}) {
  if(env.GOOGLE_MAPS_SERVER_API_KEY){
    try {
      const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.search=new URLSearchParams({latlng:`${latitude},${longitude}`,language:'fr',key:env.GOOGLE_MAPS_SERVER_API_KEY}).toString();
      const response=await fetcher(url,{signal:AbortSignal.timeout(7000)});
      if(response.ok){const data=await response.json();const address=data.status==='OK'?data.results?.[0]?.formatted_address:null;if(address)return {address,provider:'Google Maps'};}
    }catch{/* Continue with the French public address service. */}
  }
  // Mainland France only: do not propose the nearest French address abroad.
  if(latitude<41||latitude>51.5||longitude< -5.5||longitude>10)return {address:null};
  try {
    const url=new URL('https://data.geopf.fr/geocodage/reverse');
    url.search=new URLSearchParams({lat:String(latitude),lon:String(longitude),index:'address',limit:'1'}).toString();
    const response=await fetcher(url,{signal:AbortSignal.timeout(7000)});
    if(!response.ok)return {address:null};
    const data=await response.json(),feature=data.features?.[0],properties=feature?.properties;
    const point=feature?.geometry?.coordinates;
    if(!point||!Number.isFinite(point[0])||!Number.isFinite(point[1]))return {address:null};
    const distance=Math.hypot((point[1]-latitude)*111320,(point[0]-longitude)*111320*Math.cos(latitude*Math.PI/180));
    if(distance>2000)return {address:null};
    return {address:properties?.label||null,provider:'IGN · Base Adresse Nationale'};
  }catch{return {address:null};}
}
module.exports={reverseAddress};
