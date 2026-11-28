import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {uiIconModule} from './helpers/ui-icon-module.mjs';
const {default:Icon}=await import(uiIconModule);
test('shared action icons are decorative, consistently sized and cannot take keyboard focus',()=>{
 for(const name of ['edit','close','external','check','search','send']){
  const html=renderToStaticMarkup(createElement(Icon,{name,size:18}));
  assert.match(html,/width="18" height="18"/);assert.match(html,/aria-hidden="true" focusable="false"/);assert.match(html,/stroke-width="1.75"/);assert.doesNotMatch(html,/<title|tabindex/);
 }
});
test('an unrecognised icon name cannot inject content into the trusted artwork',()=>{
 const html=renderToStaticMarkup(createElement(Icon,{name:'<script>alert(1)</script>'}));
 assert.doesNotMatch(html,/<script|alert\(1\)/);assert.match(html,/<rect/);
});
