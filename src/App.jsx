import { useEffect, useMemo, useState } from 'react'
import { auctionLots, cases } from './data/cases.js'

const SAVE_KEY = 'rain-alley-13-v2'
const initialState = {
  started:false, caseIndex:0, night:1, coins:80, reputation:0,
  found:{}, asked:{}, hints:{}, wrong:{}, solved:{}, decisions:{},
  archive:[], auction:[], ledger:[], chapterEnded:false,
}

function readSave(){
  try { return { ...initialState, ...JSON.parse(localStorage.getItem(SAVE_KEY) || '{}') } }
  catch { return initialState }
}

export default function App(){
  const [game,setGame] = useState(readSave)
  const [scene,setScene] = useState('counter')
  const [activeClue,setActiveClue] = useState(null)
  const [activeAnswer,setActiveAnswer] = useState(null)
  const [code,setCode] = useState(['','',''])
  const [outcome,setOutcome] = useState(null)
  const current = cases[Math.min(game.caseIndex,cases.length-1)]
  const found = game.found[current.id] || []
  const asked = game.asked[current.id] || []
  const hintLevel = game.hints[current.id] || 0
  const solved = Boolean(game.solved[current.id])
  const completeness = Math.min(100,(found.length + asked.length + (solved?2:0))*10)

  useEffect(()=>localStorage.setItem(SAVE_KEY,JSON.stringify(game)),[game])
  useEffect(()=>{ setActiveClue(null);setActiveAnswer(null);setCode(['','','']); },[game.caseIndex])

  const mutate = fn => setGame(prev=>fn(structuredClone(prev)))
  const pulse = () => navigator.vibrate?.(18)

  function discover(clue){
    pulse(); setActiveClue(clue)
    if(found.includes(clue.id)) return
    mutate(next=>{ next.found[current.id]=[...(next.found[current.id]||[]),clue.id];return next })
  }

  function askQuestion(index){
    pulse(); setActiveAnswer(index)
    if(asked.includes(index)) return
    mutate(next=>{ next.asked[current.id]=[...(next.asked[current.id]||[]),index];return next })
  }

  function revealHint(){
    mutate(next=>{next.hints[current.id]=Math.min(3,(next.hints[current.id]||0)+1);return next})
  }

  function submitCode(){
    if(code.join('')===current.code){
      pulse(); mutate(next=>{next.solved[current.id]=true;return next})
    } else {
      pulse(); mutate(next=>{next.wrong[current.id]=(next.wrong[current.id]||0)+1;return next})
      setCode(['','',''])
    }
  }

  function decide(decision){
    mutate(next=>{
      next.coins=Math.max(0,next.coins+decision.coins)
      next.reputation+=decision.rep
      next.decisions[current.id]=decision.id
      if(decision.archive&&!next.archive.includes(current.id)) next.archive.push(current.id)
      next.ledger.push({night:next.night,item:current.title,choice:decision.title,outcome:decision.outcome,coins:decision.coins,rep:decision.rep})
      return next
    })
    setOutcome(decision)
  }

  function continueNight(){
    setOutcome(null)
    if(game.caseIndex < cases.length-1){
      mutate(next=>{next.caseIndex++;next.night++;return next})
      setScene('counter')
    } else {
      mutate(next=>{next.chapterEnded=true;return next})
      setScene('ending')
    }
  }

  function buyLot(lot){
    if(game.coins<lot.price||game.auction.includes(lot.id)) return
    mutate(next=>{next.coins-=lot.price;next.auction.push(lot.id);next.ledger.push({night:next.night,item:lot.title,choice:'拍卖购入',outcome:'隔壁档案柜在它入库时轻轻敲了三下。',coins:-lot.price,rep:0});return next})
  }

  function resetGame(){
    if(!confirm('确定清除全部营业记录，重新继承事务所吗？')) return
    localStorage.removeItem(SAVE_KEY);setGame(initialState);setScene('counter');setOutcome(null)
  }

  if(!game.started) return <Intro onStart={()=>mutate(next=>{next.started=true;return next})}/>

  return <div className="game-shell">
    <div className="rain-layer" />
    <Hud game={game} onScene={setScene} onReset={resetGame}/>
    <main className={`scene scene-${scene}`}>
      {['counter','inspect','question','solve'].includes(scene) && <CaseHeader current={current} completeness={completeness}/>} 
      {scene==='counter' && <CounterScene current={current} setScene={setScene} solved={solved}/>} 
      {scene==='inspect' && <InspectScene current={current} found={found} activeClue={activeClue} discover={discover}/>} 
      {scene==='question' && <QuestionScene current={current} asked={asked} activeAnswer={activeAnswer} askQuestion={askQuestion}/>} 
      {scene==='solve' && <SolveScene current={current} found={found} asked={asked} hintLevel={hintLevel} revealHint={revealHint} code={code} setCode={setCode} submitCode={submitCode} solved={solved} wrong={game.wrong[current.id]||0} decide={decide}/>} 
      {scene==='archive' && <ArchiveScene game={game}/>} 
      {scene==='auction' && <AuctionScene game={game} buyLot={buyLot}/>} 
      {scene==='ledger' && <LedgerScene game={game}/>} 
      {scene==='ending' && <Ending game={game}/>} 
    </main>
    {['counter','inspect','question','solve'].includes(scene) && <CaseNav scene={scene} setScene={setScene} solved={solved}/>} 
    {outcome && <Outcome decision={outcome} current={current} onContinue={continueNight} last={game.caseIndex===cases.length-1}/>} 
  </div>
}

function Intro({onStart}){
  return <div className="intro-screen">
    <div className="intro-fog"/><div className="intro-content">
      <div className="door-mark"><span>13</span></div>
      <p className="kicker">CURIO · AUCTION · COMMISSION</p>
      <h1>雨巷十三号</h1><h2>奇物事务所</h2>
      <p className="intro-copy">这里收购旧物、秘密，以及偶尔仍在呼吸的东西。<br/>请谨慎估价——客人支付的未必是钱。</p>
      <button className="ornate-button" onClick={onStart}>推门营业 <i>→</i></button>
      <small>第一章 · 消失的星期八</small>
    </div>
  </div>
}

function Hud({game,onScene,onReset}){
  return <header className="hud">
    <button className="brand-button" onClick={()=>onScene('counter')}><span className="brand-moon">☾</span><span><b>雨巷十三号</b><small>奇物事务所</small></span></button>
    <div className="hud-stats"><span>第 <b>{game.night}</b> 夜</span><span>克朗 <b>{game.coins}</b></span><span>声誉 <b>{game.reputation}</b></span></div>
    <nav className="world-nav">
      <button onClick={()=>onScene('archive')}>档案室</button><button onClick={()=>onScene('auction')}>拍卖厅</button><button onClick={()=>onScene('ledger')}>营业簿</button><button className="reset-mini" onClick={onReset}>⋯</button>
    </nav>
  </header>
}

function CaseHeader({current,completeness}){
  return <div className="case-plaque"><span>委托 № {current.number}</span><b>{current.title}</b><i style={{'--progress':`${completeness}%`}}>{completeness}%</i></div>
}

function CounterScene({current,setScene,solved}){
  return <div className="counter-stage">
    <div className="counter-object"><img src={current.objectArt} alt={current.title}/><div className="object-caption"><small>本夜来物</small><b>{current.title}</b></div></div>
    <figure className="full-character"><img src={current.characterArt} alt={`${current.visitor}立绘`}/></figure>
    <div className="visitor-tag"><span>{current.visitor}</span><small>{current.address} · {current.intent}</small></div>
    <div className="dialogue-box">
      <span className="speaker">{current.visitor}</span><p>“{current.opening}”</p>
      <div className="quick-actions"><button onClick={()=>setScene('inspect')}>拿到灯下观察</button><button onClick={()=>setScene('question')}>先问几个问题</button><button onClick={()=>setScene('solve')}>{solved?'查看鉴定结论':'尝试鉴定'}</button></div>
    </div>
  </div>
}

function InspectScene({current,found,activeClue,discover}){
  return <div className="inspection-stage">
    <div className="inspection-copy"><span>OBJECT EXAMINATION</span><h2>把可疑的地方<br/>逐一找出来</h2><p>{current.description}</p></div>
    <div className="inspection-table">
      <img src={current.objectArt} alt={current.title}/>
      {current.clues.map((clue,index)=><button key={clue.id} className={`evidence-pin ${found.includes(clue.id)?'found':''}`} style={{left:`${clue.x}%`,top:`${clue.y}%`}} onClick={()=>discover(clue)}><span>{found.includes(clue.id)?'✓':index+1}</span></button>)}
    </div>
    <div className={`clue-reveal ${activeClue?'visible':''}`}>
      {activeClue?<><small>发现证据</small><b>{activeClue.label}</b><p>{activeClue.text}</p></>:<><small>检视提示</small><b>点击发光标记</b><p>已找到 {found.length}/{current.clues.length} 处异常。每一处都可能改变估价。</p></>}
    </div>
  </div>
}

function QuestionScene({current,asked,activeAnswer,askQuestion}){
  return <div className="interview-stage">
    <figure className="interview-character"><img src={current.characterArt} alt={`${current.visitor}完整立绘`}/></figure>
    <div className="question-space"><span className="scene-label">INTERVIEW · {current.visitor}</span><h2>别只听答案。<br/>也看她如何回答。</h2>
      <div className="question-list">{current.questions.map((q,i)=><button className={asked.includes(i)?'asked':''} key={q[0]} onClick={()=>askQuestion(i)}><em>{String(i+1).padStart(2,'0')}</em>{q[0]}<span>→</span></button>)}</div>
    </div>
    <div className={`answer-box ${activeAnswer!==null?'visible':''}`}>{activeAnswer!==null?<><b>{current.visitor}</b><p>“{current.questions[activeAnswer][1]}”</p></>:<p>选择一个问题。客人会记得你问过什么。</p>}</div>
  </div>
}

function SolveScene({current,found,asked,hintLevel,revealHint,code,setCode,submitCode,solved,wrong,decide}){
  const evidence = useMemo(()=>current.clues.filter(c=>found.includes(c.id)),[current,found])
  return <div className="solve-stage">
    <section className="evidence-board"><span className="scene-label">YOUR EVIDENCE</span><h2>今晚的证据</h2>
      <div className="evidence-list">{evidence.length?evidence.map((c,i)=><div key={c.id}><em>{i+1}</em><span><b>{c.label}</b><small>{c.text}</small></span></div>):<p>你还没有认真观察这件奇物。</p>}</div>
      <div className="interview-count">已完成问话 <b>{asked.length}/4</b></div>
    </section>
    <section className="lock-desk">
      {!solved?<><span className="scene-label">FINAL APPRAISAL</span><h2>输入三位印记</h2><p>答案应能被现有证据完整解释，而不是猜出来。</p>
        <div className="code-lock">{code.map((value,i)=><input key={i} value={value} inputMode="numeric" maxLength="1" aria-label={`第${i+1}位`} onChange={e=>{const next=[...code];next[i]=e.target.value.replace(/\D/g,'');setCode(next)}}/>)}</div>
        <div className="solve-actions"><button className="ornate-button small" onClick={submitCode}>提交鉴定</button><button className="hint-action" onClick={revealHint}>{hintLevel?'再给一点提示':'我卡住了'}</button></div>
        {wrong>0&&<p className="wrong-note">{wrong>=2?'连续两次不对。提示不会扣除克朗。':'顺序不对，重新检查证据。'}</p>}
        {hintLevel>0&&<div className="hint-slip"><small>提示 {hintLevel}/3</small><p>{current.hints[hintLevel-1]}</p></div>}
      </>:<><span className="scene-label">APPRAISAL COMPLETE</span><h2>鉴定成立</h2><p className="conclusion">{current.conclusion}</p><h3>现在决定它的去向</h3><div className="decision-grid">{current.decisions.map(d=><button key={d.id} onClick={()=>decide(d)}><b>{d.title}</b><small>{d.caption}</small><span>{d.coins>0?'+':''}{d.coins} ¤ · 声誉 {d.rep>0?'+':''}{d.rep}</span></button>)}</div></>}
    </section>
  </div>
}

function CaseNav({scene,setScene,solved}){
  return <nav className="case-nav"><button className={scene==='counter'?'active':''} onClick={()=>setScene('counter')}><i>♟</i><span>接待</span></button><button className={scene==='inspect'?'active':''} onClick={()=>setScene('inspect')}><i>⌕</i><span>检视</span></button><button className={scene==='question'?'active':''} onClick={()=>setScene('question')}><i>“</i><span>问话</span></button><button className={scene==='solve'?'active':''} onClick={()=>setScene('solve')}><i>{solved?'✓':'◇'}</i><span>鉴定</span></button></nav>
}

function ArchiveScene({game}){
  const owned=new Set([...game.archive,...game.auction])
  return <Room title="地下档案室" eyebrow="ARCHIVE · COLLECTION" description="有些东西被收藏，是因为不能让它们在外面自由活动。"><div className="collection-grid">{cases.map(c=><article className={owned.has(c.id)?'':'locked'} key={c.id}><img src={c.objectArt}/><span>{owned.has(c.id)?c.title:'尚未收录'}</span></article>)}{auctionLots.map(l=><article className={owned.has(l.id)?'lot-card':'lot-card locked'} key={l.id}><i>{l.icon}</i><span>{owned.has(l.id)?l.title:'未知拍品'}</span></article>)}</div></Room>
}

function AuctionScene({game,buyLot}){
  return <Room title="乌鸦槌拍卖厅" eyebrow="NIGHT AUCTION" description="出价即成交。拍卖师不接受退货，也不保证拍品只有一位主人。"><div className="auction-room">{auctionLots.map(l=><article key={l.id}><i>{l.icon}</i><small>LOT {l.price}</small><h3>{l.title}</h3><p>{l.description}</p><button disabled={game.auction.includes(l.id)||game.coins<l.price} onClick={()=>buyLot(l)}>{game.auction.includes(l.id)?'已经购得':`${l.price} 克朗 · 出价`}</button></article>)}</div></Room>
}

function LedgerScene({game}){
  return <Room title="事务所营业簿" eyebrow="LEDGER · CONSEQUENCES" description="你做过的决定不会消失，只会换一种方式回来。"><div className="ledger-timeline">{game.ledger.length?game.ledger.slice().reverse().map((r,i)=><article key={i}><em>第 {r.night} 夜</em><div><h3>{r.item} · {r.choice}</h3><p>{r.outcome}</p></div><span>{r.coins>0?'+':''}{r.coins} ¤</span></article>):<p>还没有任何处置记录。</p>}</div></Room>
}

function Room({title,eyebrow,description,children}){return <div className="room-screen"><header><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></header>{children}</div>}

function Outcome({decision,current,onContinue,last}){
  return <div className="outcome-overlay"><div className="outcome-card"><span className="wax-seal">鉴</span><small>第十三号处置记录</small><h2>{decision.title}</h2><b>{current.title}</b><p>{decision.outcome}</p><div><span>{decision.coins>0?'+':''}{decision.coins} 克朗</span><span>声誉 {decision.rep>0?'+':''}{decision.rep}</span></div><button className="ornate-button" onClick={onContinue}>{last?'查看第一章结局':'迎接下一位客人'} →</button></div></div>
}

function Ending({game}){
  const good=game.reputation>=4
  return <div className="ending-screen"><div><span>第一章 · 消失的星期八</span><h1>{good?'店门仍然认得你':'你成了自己的下一位客人'}</h1><p>市政厅否认本周曾出现第八天。白榆街居民则表示，十三号建筑一直存在，只是过去从未如此饥饿。</p><p>你的选择形成了 <b>{game.reputation}</b> 点声誉，留下 <b>{game.archive.length}</b> 件奇物。真正的店主仍未找到。</p></div></div>
}
