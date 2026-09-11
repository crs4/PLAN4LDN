"use client"

/* eslint-disable */

(function(){

// This is for grouping buttons into a bar
// takes an array of `L.easyButton`s and
// then the usual `.addTo(map)`

// eslint-disable-no-undef
L.Control.EasyBar = L.Control.extend({ // eslint-disable-line

  options: {
    position:       'topleft',  // part of leaflet's defaults
    id:             null,       // an id to tag the Bar with
    leafletClasses: true,        // use leaflet classes?
  },

  initialize: function(buttons, options){ // eslint-disable-line

    if(options){
      L.Util.setOptions( this, options ); // eslint-disable-line
    }

    this._buildContainer(); // eslint-disable-line
    this._buttons = []; // eslint-disable-line

    for(let i = 0; i < buttons.length; i+=1){
      buttons[i]._bar = this; //eslint-disable-line 
      buttons[i]._container = buttons[i].button; //eslint-disable-line 
      this._buttons.push(buttons[i]); // eslint-disable-line
      this.container.appendChild(buttons[i].button);
    }

  },

  _buildContainer: function(){ // eslint-disable-line
    this._container = this.container = L.DomUtil.create('div', ''); // eslint-disable-line
    this.options.leafletClasses && L.DomUtil.addClass(this.container, 'leaflet-bar easy-button-container leaflet-control'); // eslint-disable-line
    this.options.id && (this.container.id = this.options.id);
  },


  enable: function(){ // eslint-disable-line
    L.DomUtil.addClass(this.container, 'enabled'); // eslint-disable-line
    L.DomUtil.removeClass(this.container, 'disabled'); // eslint-disable-line
    this.container.setAttribute('aria-hidden', 'false');
    return this;
  },


  disable: function(){ // eslint-disable-line
    L.DomUtil.addClass(this.container, 'disabled'); // eslint-disable-line
    L.DomUtil.removeClass(this.container, 'enabled'); // eslint-disable-line
    this.container.setAttribute('aria-hidden', 'true');
    return this;
  },


  onAdd: function () { // eslint-disable-line
    return this.container;
  },

  addTo: function (map) { // eslint-disable-line
    this._map = map; //eslint-disable-line 

    for(let i = 0; i < this._buttons.length; i+=1){ //eslint-disable-line 
      this._buttons[i]._map = map; //eslint-disable-line 
    }

    let container = this._container = this.onAdd(map); // eslint-disable-line
    const pos = this.getPosition();
    const corner = map._controlCorners[pos]; // eslint-disable-line

    L.DomUtil.addClass(container, 'leaflet-control'); // eslint-disable-line

    if (pos.indexOf('bottom') !== -1) {
      corner.insertBefore(container, corner.firstChild);
    } else {
      corner.appendChild(container);
    }

    return this;
  },

});

L.easyBar = function(){ // eslint-disable-line
  let args = [L.Control.EasyBar]; // eslint-disable-line
  for(let i = 0; i < arguments.length; i+=1){ //eslint-disable-line 
    args.push( arguments[i] ); //eslint-disable-line 
  }
  return new (Function.prototype.bind.apply(L.Control.EasyBar, args)); // eslint-disable-line
};

// L.EasyButton is the actual buttons
// can be called without being grouped into a bar
L.Control.EasyButton = L.Control.extend({ // eslint-disable-line

  options: {
    position:  'topright',       // part of leaflet's defaults

    id:        null,            // an id to tag the button with

    type:      'replace',       // [(replace|animate)]
                                // replace swaps out elements
                                // animate changes classes with all elements inserted

    states:    [],              // state names look like this
                                // {
                                //   stateName: 'untracked',
                                //   onClick: function(){ handle_nav_manually(); };
                                //   title: 'click to make inactive',
                                //   icon: 'fa-circle',    // wrapped with <a>
                                // }

    leafletClasses:   true,     // use leaflet styles for the button
    tagName:          'button',
  },

  initialize: function(icon, onClick, title, id){ // eslint-disable-line

    // clear the states manually
    this.options.states = [];

    // add id to options
    if(id != null){
      this.options.id = id;
    }

    // storage between state functions
    this.storage = {};

    // is the last item an object?
    if( typeof arguments[arguments.length-1] === 'object' ){ // eslint-disable-line

      // if so, it should be the options
      L.Util.setOptions( this, arguments[arguments.length-1] ); // eslint-disable-line
    }

    // if there aren't any states in options
    // use the early params
    if( this.options.states.length === 0 &&
        typeof icon  === 'string' &&
        typeof onClick === 'function'){

      // turn the options object into a state
      this.options.states.push({ 
        icon: icon, // eslint-disable-line
        onClick: onClick, // eslint-disable-line
        title: typeof title === 'string' ? title : '',
      });
    }

    // curate and move user's states into
    // the _states for internal use
    this._states = []; //eslint-disable-line 

    for(let i = 0; i < this.options.states.length; i+=1){
      this._states.push( new State(this.options.states[i], this) ); // eslint-disable-line
    }

    this._buildButton(); // eslint-disable-line

    this._activateState(this._states[0]); // eslint-disable-line

  },

  _buildButton: function(){ // eslint-disable-line

    this.button = L.DomUtil.create(this.options.tagName, ''); // eslint-disable-line

    if (this.options.tagName === 'button') {
        this.button.setAttribute('type', 'button');
    }

    if (this.options.id ){
      this.button.id = this.options.id;
    }

    if (this.options.leafletClasses){
      L.DomUtil.addClass(this.button, 'easy-button-button leaflet-bar-part leaflet-interactive'); // eslint-disable-line
    }

    // don't let double clicks and mousedown get to the map
    L.DomEvent.addListener(this.button, 'dblclick', L.DomEvent.stop); // eslint-disable-line
    L.DomEvent.addListener(this.button, 'mousedown', L.DomEvent.stop); // eslint-disable-line
    L.DomEvent.addListener(this.button, 'mouseup', L.DomEvent.stop); // eslint-disable-line

    // take care of normal clicks
    L.DomEvent.addListener(this.button,'click', function(e){ // eslint-disable-line
      L.DomEvent.stop(e);  // eslint-disable-line
      this._currentState.onClick(this, this._map ? this._map : null ); // eslint-disable-line
      this._map && this._map.getContainer().focus(); // eslint-disable-line
    }, this);

    // prep the contents of the control
    if(this.options.type == 'replace'){
      this.button.appendChild(this._currentState.icon); // eslint-disable-line
    } else {
      for(let i=0;i<this._states.length;i+=1){ // eslint-disable-line
        this.button.appendChild(this._states[i].icon); // eslint-disable-line
      }
    }
  },

  _currentState: {
    // placeholder content
    stateName: 'unnamed',
    icon: (function(){ return document.createElement('span'); })(),
  },

  _states: null, // populated on init

  state: function(newState){ // eslint-disable-line

    // when called with no args, it's a getter
    if (arguments.length === 0) {
      return this._currentState.stateName; // eslint-disable-line
    }

    // activate by name
    if(typeof newState == 'string'){

      this._activateStateNamed(newState); // eslint-disable-line

    // activate by index
    } else if (typeof newState == 'number'){

      this._activateState(this._states[newState]); // eslint-disable-line
    }

    return this;
  },

  _activateStateNamed: function(stateName){ //eslint-disable-line 
    for(let i = 0; i < this._states.length; i+=1){ // eslint-disable-line
      if( this._states[i].stateName == stateName ){ // eslint-disable-line
        this._activateState( this._states[i] ); // eslint-disable-line
      }
    }
  },

  _activateState: function(newState){ // eslint-disable-line

    if( newState === this._currentState ){ // eslint-disable-line

      // don't touch the dom if it'll just be the same after
      return; // eslint-disable-line

    } 

    // swap out elements... if you're into that kind of thing
    if ( this.options.type == 'replace' ){
      this.button.appendChild(newState.icon);
      this.button.removeChild(this._currentState.icon); // eslint-disable-line
    }

    if ( newState.title ){
      this.button.title = newState.title;
    } else {
      this.button.removeAttribute('title');
    }

    // update classes for animations
    for(let i=0;i<this._states.length;i+=1){ // eslint-disable-line
      L.DomUtil.removeClass(this._states[i].icon, this._currentState.stateName + '-active'); // eslint-disable-line
      L.DomUtil.addClass(this._states[i].icon, newState.stateName + '-active'); // eslint-disable-line
    }

    // update classes for animations
    L.DomUtil.removeClass(this.button, this._currentState.stateName + '-active'); // eslint-disable-line
    L.DomUtil.addClass(this.button, newState.stateName + '-active'); // eslint-disable-line
 
    // update the record
    this._currentState = newState; // eslint-disable-line
  },

  enable: function(){ // eslint-disable-line
    L.DomUtil.addClass(this.button, 'enabled'); // eslint-disable-line
    L.DomUtil.removeClass(this.button, 'disabled'); // eslint-disable-line
    this.button.setAttribute('aria-hidden', 'false');
    return this;
  },

  disable: function(){ // eslint-disable-line
    L.DomUtil.addClass(this.button, 'disabled'); // eslint-disable-line
    L.DomUtil.removeClass(this.button, 'enabled'); // eslint-disable-line
    this.button.setAttribute('aria-hidden', 'true');
    return this;
  },

  onAdd: function(map){ // eslint-disable-line
    var bar = L.easyBar([this], { // eslint-disable-line
      position: this.options.position,
      leafletClasses: this.options.leafletClasses,
    });
    this._anonymousBar = bar; // eslint-disable-line
    this._container = bar.container; // eslint-disable-line
    return this._anonymousBar.container; // eslint-disable-line
  },

  removeFrom: function (map) { // eslint-disable-line
    if (this._map === map) // eslint-disable-line
      this.remove();
    return this;
  },

});

L.easyButton = function(/* args will pass automatically */){ // eslint-disable-line
  let args = Array.prototype.concat.apply([L.Control.EasyButton],arguments); // eslint-disable-line
  return new (Function.prototype.bind.apply(L.Control.EasyButton, args)); // eslint-disable-line
};

// util functions

// constructor for states so only curated
// states end up getting called
function State(template, easyButton){ // eslint-disable-line

  this.title = template.title;
  this.stateName = template.stateName ? template.stateName : 'unnamed-state';

  // build the wrapper
  this.icon = L.DomUtil.create('span', ''); // eslint-disable-line

  L.DomUtil.addClass(this.icon, 'button-state state-' + this.stateName.replace(/(^\s*|\s*$)/g,'')); // eslint-disable-line
  this.icon.innerHTML = buildIcon(template.icon);
  this.onClick = L.Util.bind(template.onClick?template.onClick:function(){}, easyButton); // eslint-disable-line
}

function buildIcon(ambiguousIconString) {

  let tmpIcon;

  // does this look like html? (i.e. not a class)
  if( ambiguousIconString.match(/[&;=<>"']/) ){  // eslint-disable-line

    // if so, the user should have put in html
    // so move forward as such
    tmpIcon = ambiguousIconString;

  // then it wasn't html, so
  // it's a class list, figure out what kind
  } else {
      ambiguousIconString = ambiguousIconString.replace(/(^\s*|\s*$)/g,''); // eslint-disable-line
      tmpIcon = L.DomUtil.create('span', ''); //eslint-disable-line 

      if( ambiguousIconString.indexOf('fa-') === 0 ){
        L.DomUtil.addClass(tmpIcon, 'fa '  + ambiguousIconString) // eslint-disable-line
      } else if ( ambiguousIconString.indexOf('glyphicon-') === 0 ) {
        L.DomUtil.addClass(tmpIcon, 'glyphicon ' + ambiguousIconString) // eslint-disable-line
      } else {
        L.DomUtil.addClass(tmpIcon, ambiguousIconString) // eslint-disable-line
      }

      // make this a string so that it's easy to set innerHTML below
      tmpIcon = tmpIcon.outerHTML;
  }

  return tmpIcon;
}

})();
