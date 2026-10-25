// Affiliate-only country decision from the existing hosting provider. No IP/location logging.
export default function handler(req,res){
 res.setHeader('Cache-Control','private, no-store');
 res.setHeader('Vary','Sec-GPC');
 if(req.method!=='GET'){res.setHeader('Allow','GET');return res.status(405).end();}
 const us=process.env.VERCEL==='1'&&req.headers['x-vercel-ip-country']==='US';
 return res.status(200).json({policy:us&&req.headers['sec-gpc']!=='1'?'affiliate-us-optout-v1':null});
}
