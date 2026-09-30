// Never log coordinates or provider URLs (Google URLs include a private key).
const photonCache=new Map();
function nearby(feature,latitude,longitude){
  const point=feature?.geometry?.coordinates;
  if(!point||!Number.isFinite(point[0])||!Number.isFinite(point[1]))return false;
  return Math.hypot((point[1]-latitude)*111320,(point[0]-longitude)*111320*Math.cos(latitude*Math.PI/180))<=2000;
}
async function photonAddress(latitude,longitude,{env,fetcher}){
  const url=new URL(env.PHOTON_REVERSE_URL||'https://photon.komoot.io/reverse');
  url.search=new URLSearchParams({lat:String(latitude),lon:String(longitude),lang:'fr',limit:'1',radius:'2'}).toString();
  // A short, bounded in-memory cache avoids repeated provider requests; no GPS database.
  const key=url.toString(),now=Date.now();
  if(fetcher===fetch){
    for(const [k,v] of photonCache)if(v.expires<=now)photonCache.delete(k);
    if(photonCache.has(key))return photonCache.get(key).value;
  }
  try{
    const response=await fetcher(url,{headers:{'User-Agent':'DailyChickenPizza/1.0 (+https://www.dailychickenpizza.fr)'},signal:AbortSignal.timeout(7000)});
    if(!response.ok)return {address:null};
    const data=await response.json(),feature=data.features?.[0];
    if(!nearby(feature,latitude,longitude))return {address:null};
    const p=feature.properties||{};
    const text=value=>typeof value==='string'?value.trim():'';
    const street=text(p.street)||(p.type==='street'?text(p.name):'');
    const locality=text(p.city)||text(p.town)||text(p.village)||text(p.district)||text(p.county);
    const line=[text(p.housenumber),street].filter(Boolean).join(' ');
    const town=[text(p.postcode),locality].filter(Boolean).join(' ');
    const parts=[line,town,text(p.state),text(p.country)].filter(Boolean);
    if(!street&&!locality)return {address:null};
    const address=[...new Set(parts)].join(', ');
    const value={address,provider:'OpenStreetMap · Photon',partial:!street||!text(p.housenumber)};
    if(fetcher===fetch){if(photonCache.size>=200)photonCache.delete(photonCache.keys().next().value);photonCache.set(key,{expires:now+600000,value});}
    return value;
  }catch{return {address:null};}
}
async function reverseAddress(latitude,longitude,{env=process.env,fetcher=fetch}={}) {
  if(env.GOOGLE_MAPS_SERVER_API_KEY){
    try {
      const url=new URL('https://maps.googleapis.com/maps/api/geocode/json');
      url.search=new URLSearchParams({latlng:`${latitude},${longitude}`,language:'fr',key:env.GOOGLE_MAPS_SERVER_API_KEY}).toString();
      const response=await fetcher(url,{signal:AbortSignal.timeout(7000)});
      if(response.ok){const data=await response.json();const address=data.status==='OK'?data.results?.[0]?.formatted_address:null;if(address)return {address,provider:'Google Maps'};}
    }catch{/* Continue with public address services. */}
  }
  // IGN covers France. Elsewhere use worldwide OSM addresses, never a distant French one.
  if(latitude>=41&&latitude<=51.5&&longitude>=-5.5&&longitude<=10){
    try {
      const url=new URL('https://data.geopf.fr/geocodage/reverse');
      url.search=new URLSearchParams({lat:String(latitude),lon:String(longitude),index:'address',limit:'1'}).toString();
      const response=await fetcher(url,{signal:AbortSignal.timeout(7000)});
      if(response.ok){
        const data=await response.json(),feature=data.features?.[0];
        if(nearby(feature,latitude,longitude)&&feature.properties?.label)return {address:feature.properties.label,provider:'IGN · Base Adresse Nationale'};
      }
    }catch{/* Continue with worldwide reverse geocoding. */}
  }
  return photonAddress(latitude,longitude,{env,fetcher});
}
module.exports={reverseAddress};
