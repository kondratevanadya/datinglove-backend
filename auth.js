
import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from './db.js';

const router = express.Router();
const SECRET="supersecret";

router.post('/register',(req,res)=>{
  const {email,password}=req.body;
  const hash=bcrypt.hashSync(password,10);
  try{
    db.prepare('INSERT INTO users(email,password) VALUES(?,?)').run(email,hash);
    res.json({ok:true});
  }catch(e){
    res.status(400).json({error:"Email exists"});
  }
});

router.post('/login',(req,res)=>{
  const {email,password}=req.body;
  const user=db.prepare('SELECT * FROM users WHERE email=?').get(email);
  if(!user) return res.status(400).json({error:"No user"});
  if(!bcrypt.compareSync(password,user.password)) return res.status(400).json({error:"Wrong pass"});
  const token=jwt.sign({id:user.id},SECRET,{expiresIn:"7d"});
  res.json({token});
});

export function auth(req,res,next){
  const h=req.headers.authorization;
  if(!h) return res.status(401).json({error:"No token"});
  try{
    req.user=jwt.verify(h.split(' ')[1],SECRET);
    next();
  }catch(e){
    res.status(401).json({error:"Bad token"});
  }
}

export default router;
