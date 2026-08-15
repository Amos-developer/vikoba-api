const buckets = new Map();

export const rateLimit = ({ windowMs, max, keyPrefix }) => (req,res,next) => {
  const now=Date.now();
  const key=`${keyPrefix}:${req.ip}`;
  const bucket=buckets.get(key);
  if(!bucket||bucket.resetAt<=now) {
    buckets.set(key,{count:1,resetAt:now+windowMs});
    return next();
  }
  bucket.count+=1;
  if(bucket.count<=max) return next();
  res.set("Retry-After",String(Math.ceil((bucket.resetAt-now)/1000)));
  return res.status(429).json({success:false,message:"Too many requests. Please try again later."});
};

setInterval(() => {
  const now=Date.now();
  for(const [key,bucket] of buckets) if(bucket.resetAt<=now) buckets.delete(key);
},60_000).unref();
