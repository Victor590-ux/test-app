// Tiny UI helper (no framework)
export const ui = {
  _root: null,
  _view: null,
  _state: null,
  createState(obj){ return new Proxy(obj, { set(t,k,v){ t[k]=v; return true; } }); },
  h(tag, props={}, children=[]){
    if(children==null) children = [];
    if(!Array.isArray(children)) children=[children];
    return { tag, props, children: children.filter(c=>c!==null && c!==undefined) };
  },
  mount(root, viewFn, state){
    this._root = root;
    this._view = viewFn;
    this._state = state;
  },
  render(){
    const node = this._view();
    this._root.replaceChildren(this._create(node));
  },
  _create(v){
    if(typeof v === 'string' || typeof v === 'number'){
      return document.createTextNode(String(v));
    }
    const el = document.createElement(v.tag);
    const props = v.props || {};
    for(const [k,val] of Object.entries(props)){
      if(k==='class') el.className = val;
      else if(k==='style') el.setAttribute('style', val);
      else if(k.startsWith('on') && typeof val === 'function'){
        el.addEventListener(k.slice(2), val);
      }else if(val!==undefined && val!==null){
        if(k in el) el[k]=val;
        else el.setAttribute(k, String(val));
      }
    }
    for(const c of (v.children||[])){
      el.appendChild(this._create(c));
    }
    return el;
  }
};
