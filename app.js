(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

// cached from whatever global is present so that test runners that stub it
// don't break things.  But we need to wrap it in a try catch in case it is
// wrapped in strict mode code which doesn't define any globals.  It's inside a
// function because try/catches deoptimize in certain engines.

var cachedSetTimeout;
var cachedClearTimeout;

(function () {
  try {
    cachedSetTimeout = setTimeout;
  } catch (e) {
    cachedSetTimeout = function () {
      throw new Error('setTimeout is not defined');
    }
  }
  try {
    cachedClearTimeout = clearTimeout;
  } catch (e) {
    cachedClearTimeout = function () {
      throw new Error('clearTimeout is not defined');
    }
  }
} ())
var queue = [];
var draining = false;
var currentQueue;
var queueIndex = -1;

function cleanUpNextTick() {
    if (!draining || !currentQueue) {
        return;
    }
    draining = false;
    if (currentQueue.length) {
        queue = currentQueue.concat(queue);
    } else {
        queueIndex = -1;
    }
    if (queue.length) {
        drainQueue();
    }
}

function drainQueue() {
    if (draining) {
        return;
    }
    var timeout = cachedSetTimeout(cleanUpNextTick);
    draining = true;

    var len = queue.length;
    while(len) {
        currentQueue = queue;
        queue = [];
        while (++queueIndex < len) {
            if (currentQueue) {
                currentQueue[queueIndex].run();
            }
        }
        queueIndex = -1;
        len = queue.length;
    }
    currentQueue = null;
    draining = false;
    cachedClearTimeout(timeout);
}

process.nextTick = function (fun) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
        for (var i = 1; i < arguments.length; i++) {
            args[i - 1] = arguments[i];
        }
    }
    queue.push(new Item(fun, args));
    if (queue.length === 1 && !draining) {
        cachedSetTimeout(drainQueue, 0);
    }
};

// v8 likes predictible objects
function Item(fun, array) {
    this.fun = fun;
    this.array = array;
}
Item.prototype.run = function () {
    this.fun.apply(null, this.array);
};
process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];
process.version = ''; // empty string to avoid regexp issues
process.versions = {};

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};
process.umask = function() { return 0; };

},{}],2:[function(require,module,exports){

/**
 * @license
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict';

/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * A cached reference to the hasOwnProperty function.
 */
var hasOwnProperty = Object.prototype.hasOwnProperty;

/**
 * A cached reference to the create function.
 */
var create = Object.create;

/**
 * Used to prevent property collisions between our "map" and its prototype.
 * @param {!Object<string, *>} map The map to check.
 * @param {string} property The property to check.
 * @return {boolean} Whether map has property.
 */
var has = function (map, property) {
  return hasOwnProperty.call(map, property);
};

/**
 * Creates an map object without a prototype.
 * @return {!Object}
 */
var createMap = function () {
  return create(null);
};

/**
 * Keeps track of information needed to perform diffs for a given DOM node.
 * @param {!string} nodeName
 * @param {?string=} key
 * @constructor
 */
function NodeData(nodeName, key) {
  /**
   * The attributes and their values.
   * @const {!Object<string, *>}
   */
  this.attrs = createMap();

  /**
   * An array of attribute name/value pairs, used for quickly diffing the
   * incomming attributes to see if the DOM node's attributes need to be
   * updated.
   * @const {Array<*>}
   */
  this.attrsArr = [];

  /**
   * The incoming attributes for this Node, before they are updated.
   * @const {!Object<string, *>}
   */
  this.newAttrs = createMap();

  /**
   * The key used to identify this node, used to preserve DOM nodes when they
   * move within their parent.
   * @const
   */
  this.key = key;

  /**
   * Keeps track of children within this node by their key.
   * {?Object<string, !Element>}
   */
  this.keyMap = null;

  /**
   * Whether or not the keyMap is currently valid.
   * {boolean}
   */
  this.keyMapValid = true;

  /**
   * The node name for this node.
   * @const {string}
   */
  this.nodeName = nodeName;

  /**
   * @type {?string}
   */
  this.text = null;
}

/**
 * Initializes a NodeData object for a Node.
 *
 * @param {Node} node The node to initialize data for.
 * @param {string} nodeName The node name of node.
 * @param {?string=} key The key that identifies the node.
 * @return {!NodeData} The newly initialized data object
 */
var initData = function (node, nodeName, key) {
  var data = new NodeData(nodeName, key);
  node['__incrementalDOMData'] = data;
  return data;
};

/**
 * Retrieves the NodeData object for a Node, creating it if necessary.
 *
 * @param {Node} node The node to retrieve the data for.
 * @return {!NodeData} The NodeData for this Node.
 */
var getData = function (node) {
  var data = node['__incrementalDOMData'];

  if (!data) {
    var nodeName = node.nodeName.toLowerCase();
    var key = null;

    if (node instanceof Element) {
      key = node.getAttribute('key');
    }

    data = initData(node, nodeName, key);
  }

  return data;
};

/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @const */
var symbols = {
  default: '__default',

  placeholder: '__placeholder'
};

/**
 * @param {string} name
 * @return {string|undefined} The namespace to use for the attribute.
 */
var getNamespace = function (name) {
  if (name.lastIndexOf('xml:', 0) === 0) {
    return 'http://www.w3.org/XML/1998/namespace';
  }

  if (name.lastIndexOf('xlink:', 0) === 0) {
    return 'http://www.w3.org/1999/xlink';
  }
};

/**
 * Applies an attribute or property to a given Element. If the value is null
 * or undefined, it is removed from the Element. Otherwise, the value is set
 * as an attribute.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {?(boolean|number|string)=} value The attribute's value.
 */
var applyAttr = function (el, name, value) {
  if (value == null) {
    el.removeAttribute(name);
  } else {
    var attrNS = getNamespace(name);
    if (attrNS) {
      el.setAttributeNS(attrNS, name, value);
    } else {
      el.setAttribute(name, value);
    }
  }
};

/**
 * Applies a property to a given Element.
 * @param {!Element} el
 * @param {string} name The property's name.
 * @param {*} value The property's value.
 */
var applyProp = function (el, name, value) {
  el[name] = value;
};

/**
 * Applies a style to an Element. No vendor prefix expansion is done for
 * property names/values.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {*} style The style to set. Either a string of css or an object
 *     containing property-value pairs.
 */
var applyStyle = function (el, name, style) {
  if (typeof style === 'string') {
    el.style.cssText = style;
  } else {
    el.style.cssText = '';
    var elStyle = el.style;
    var obj = /** @type {!Object<string,string>} */style;

    for (var prop in obj) {
      if (has(obj, prop)) {
        elStyle[prop] = obj[prop];
      }
    }
  }
};

/**
 * Updates a single attribute on an Element.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {*} value The attribute's value. If the value is an object or
 *     function it is set on the Element, otherwise, it is set as an HTML
 *     attribute.
 */
var applyAttributeTyped = function (el, name, value) {
  var type = typeof value;

  if (type === 'object' || type === 'function') {
    applyProp(el, name, value);
  } else {
    applyAttr(el, name, /** @type {?(boolean|number|string)} */value);
  }
};

/**
 * Calls the appropriate attribute mutator for this attribute.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {*} value The attribute's value.
 */
var updateAttribute = function (el, name, value) {
  var data = getData(el);
  var attrs = data.attrs;

  if (attrs[name] === value) {
    return;
  }

  var mutator = attributes[name] || attributes[symbols.default];
  mutator(el, name, value);

  attrs[name] = value;
};

/**
 * A publicly mutable object to provide custom mutators for attributes.
 * @const {!Object<string, function(!Element, string, *)>}
 */
var attributes = createMap();

// Special generic mutator that's called for any attribute that does not
// have a specific mutator.
attributes[symbols.default] = applyAttributeTyped;

attributes[symbols.placeholder] = function () {};

attributes['style'] = applyStyle;

/**
 * Gets the namespace to create an element (of a given tag) in.
 * @param {string} tag The tag to get the namespace for.
 * @param {?Node} parent
 * @return {?string} The namespace to create the tag in.
 */
var getNamespaceForTag = function (tag, parent) {
  if (tag === 'svg') {
    return 'http://www.w3.org/2000/svg';
  }

  if (getData(parent).nodeName === 'foreignObject') {
    return null;
  }

  return parent.namespaceURI;
};

/**
 * Creates an Element.
 * @param {Document} doc The document with which to create the Element.
 * @param {?Node} parent
 * @param {string} tag The tag for the Element.
 * @param {?string=} key A key to identify the Element.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element.
 * @return {!Element}
 */
var createElement = function (doc, parent, tag, key, statics) {
  var namespace = getNamespaceForTag(tag, parent);
  var el = undefined;

  if (namespace) {
    el = doc.createElementNS(namespace, tag);
  } else {
    el = doc.createElement(tag);
  }

  initData(el, tag, key);

  if (statics) {
    for (var i = 0; i < statics.length; i += 2) {
      updateAttribute(el, /** @type {!string}*/statics[i], statics[i + 1]);
    }
  }

  return el;
};

/**
 * Creates a Text Node.
 * @param {Document} doc The document with which to create the Element.
 * @return {!Text}
 */
var createText = function (doc) {
  var node = doc.createTextNode('');
  initData(node, '#text', null);
  return node;
};

/**
 * Creates a mapping that can be used to look up children using a key.
 * @param {?Node} el
 * @return {!Object<string, !Element>} A mapping of keys to the children of the
 *     Element.
 */
var createKeyMap = function (el) {
  var map = createMap();
  var child = el.firstElementChild;

  while (child) {
    var key = getData(child).key;

    if (key) {
      map[key] = child;
    }

    child = child.nextElementSibling;
  }

  return map;
};

/**
 * Retrieves the mapping of key to child node for a given Element, creating it
 * if necessary.
 * @param {?Node} el
 * @return {!Object<string, !Node>} A mapping of keys to child Elements
 */
var getKeyMap = function (el) {
  var data = getData(el);

  if (!data.keyMap) {
    data.keyMap = createKeyMap(el);
  }

  return data.keyMap;
};

/**
 * Retrieves a child from the parent with the given key.
 * @param {?Node} parent
 * @param {?string=} key
 * @return {?Node} The child corresponding to the key.
 */
var getChild = function (parent, key) {
  return key ? getKeyMap(parent)[key] : null;
};

/**
 * Registers an element as being a child. The parent will keep track of the
 * child using the key. The child can be retrieved using the same key using
 * getKeyMap. The provided key should be unique within the parent Element.
 * @param {?Node} parent The parent of child.
 * @param {string} key A key to identify the child with.
 * @param {!Node} child The child to register.
 */
var registerChild = function (parent, key, child) {
  getKeyMap(parent)[key] = child;
};

/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/** @const */
var notifications = {
  /**
   * Called after patch has compleated with any Nodes that have been created
   * and added to the DOM.
   * @type {?function(Array<!Node>)}
   */
  nodesCreated: null,

  /**
   * Called after patch has compleated with any Nodes that have been removed
   * from the DOM.
   * Note it's an applications responsibility to handle any childNodes.
   * @type {?function(Array<!Node>)}
   */
  nodesDeleted: null
};

/**
 * Keeps track of the state of a patch.
 * @constructor
 */
function Context() {
  /**
   * @type {(Array<!Node>|undefined)}
   */
  this.created = notifications.nodesCreated && [];

  /**
   * @type {(Array<!Node>|undefined)}
   */
  this.deleted = notifications.nodesDeleted && [];
}

/**
 * @param {!Node} node
 */
Context.prototype.markCreated = function (node) {
  if (this.created) {
    this.created.push(node);
  }
};

/**
 * @param {!Node} node
 */
Context.prototype.markDeleted = function (node) {
  if (this.deleted) {
    this.deleted.push(node);
  }
};

/**
 * Notifies about nodes that were created during the patch opearation.
 */
Context.prototype.notifyChanges = function () {
  if (this.created && this.created.length > 0) {
    notifications.nodesCreated(this.created);
  }

  if (this.deleted && this.deleted.length > 0) {
    notifications.nodesDeleted(this.deleted);
  }
};

/**
* Makes sure that keyed Element matches the tag name provided.
* @param {!string} nodeName The nodeName of the node that is being matched.
* @param {string=} tag The tag name of the Element.
* @param {?string=} key The key of the Element.
*/
var assertKeyedTagMatches = function (nodeName, tag, key) {
  if (nodeName !== tag) {
    throw new Error('Was expecting node with key "' + key + '" to be a ' + tag + ', not a ' + nodeName + '.');
  }
};

/** @type {?Context} */
var context = null;

/** @type {?Node} */
var currentNode = null;

/** @type {?Node} */
var currentParent = null;

/** @type {?Element|?DocumentFragment} */
var root = null;

/** @type {?Document} */
var doc = null;

/**
 * Returns a patcher function that sets up and restores a patch context,
 * running the run function with the provided data.
 * @param {function((!Element|!DocumentFragment),!function(T),T=)} run
 * @return {function((!Element|!DocumentFragment),!function(T),T=)}
 * @template T
 */
var patchFactory = function (run) {
  /**
   * TODO(moz): These annotations won't be necessary once we switch to Closure
   * Compiler's new type inference. Remove these once the switch is done.
   *
   * @param {(!Element|!DocumentFragment)} node
   * @param {!function(T)} fn
   * @param {T=} data
   * @template T
   */
  var f = function (node, fn, data) {
    var prevContext = context;
    var prevRoot = root;
    var prevDoc = doc;
    var prevCurrentNode = currentNode;
    var prevCurrentParent = currentParent;
    var previousInAttributes = false;
    var previousInSkip = false;

    context = new Context();
    root = node;
    doc = node.ownerDocument;
    currentParent = node.parentNode;

    if ('production' !== 'production') {}

    run(node, fn, data);

    if ('production' !== 'production') {}

    context.notifyChanges();

    context = prevContext;
    root = prevRoot;
    doc = prevDoc;
    currentNode = prevCurrentNode;
    currentParent = prevCurrentParent;
  };
  return f;
};

/**
 * Patches the document starting at node with the provided function. This
 * function may be called during an existing patch operation.
 * @param {!Element|!DocumentFragment} node The Element or Document
 *     to patch.
 * @param {!function(T)} fn A function containing elementOpen/elementClose/etc.
 *     calls that describe the DOM.
 * @param {T=} data An argument passed to fn to represent DOM state.
 * @template T
 */
var patchInner = patchFactory(function (node, fn, data) {
  currentNode = node;

  enterNode();
  fn(data);
  exitNode();

  if ('production' !== 'production') {}
});

/**
 * Patches an Element with the the provided function. Exactly one top level
 * element call should be made corresponding to `node`.
 * @param {!Element} node The Element where the patch should start.
 * @param {!function(T)} fn A function containing elementOpen/elementClose/etc.
 *     calls that describe the DOM. This should have at most one top level
 *     element call.
 * @param {T=} data An argument passed to fn to represent DOM state.
 * @template T
 */
var patchOuter = patchFactory(function (node, fn, data) {
  currentNode = /** @type {!Element} */{ nextSibling: node };

  fn(data);

  if ('production' !== 'production') {}
});

/**
 * Checks whether or not the current node matches the specified nodeName and
 * key.
 *
 * @param {?string} nodeName The nodeName for this node.
 * @param {?string=} key An optional key that identifies a node.
 * @return {boolean} True if the node matches, false otherwise.
 */
var matches = function (nodeName, key) {
  var data = getData(currentNode);

  // Key check is done using double equals as we want to treat a null key the
  // same as undefined. This should be okay as the only values allowed are
  // strings, null and undefined so the == semantics are not too weird.
  return nodeName === data.nodeName && key == data.key;
};

/**
 * Aligns the virtual Element definition with the actual DOM, moving the
 * corresponding DOM node to the correct location or creating it if necessary.
 * @param {string} nodeName For an Element, this should be a valid tag string.
 *     For a Text, this should be #text.
 * @param {?string=} key The key used to identify this element.
 * @param {?Array<*>=} statics For an Element, this should be an array of
 *     name-value pairs.
 */
var alignWithDOM = function (nodeName, key, statics) {
  if (currentNode && matches(nodeName, key)) {
    return;
  }

  var node = undefined;

  // Check to see if the node has moved within the parent.
  if (key) {
    node = getChild(currentParent, key);
    if (node && 'production' !== 'production') {
      assertKeyedTagMatches(getData(node).nodeName, nodeName, key);
    }
  }

  // Create the node if it doesn't exist.
  if (!node) {
    if (nodeName === '#text') {
      node = createText(doc);
    } else {
      node = createElement(doc, currentParent, nodeName, key, statics);
    }

    if (key) {
      registerChild(currentParent, key, node);
    }

    context.markCreated(node);
  }

  // If the node has a key, remove it from the DOM to prevent a large number
  // of re-orders in the case that it moved far or was completely removed.
  // Since we hold on to a reference through the keyMap, we can always add it
  // back.
  if (currentNode && getData(currentNode).key) {
    currentParent.replaceChild(node, currentNode);
    getData(currentParent).keyMapValid = false;
  } else {
    currentParent.insertBefore(node, currentNode);
  }

  currentNode = node;
};

/**
 * Clears out any unvisited Nodes, as the corresponding virtual element
 * functions were never called for them.
 */
var clearUnvisitedDOM = function () {
  var node = currentParent;
  var data = getData(node);
  var keyMap = data.keyMap;
  var keyMapValid = data.keyMapValid;
  var child = node.lastChild;
  var key = undefined;

  if (child === currentNode && keyMapValid) {
    return;
  }

  if (data.attrs[symbols.placeholder] && node !== root) {
    if ('production' !== 'production') {}
    return;
  }

  while (child !== currentNode) {
    node.removeChild(child);
    context.markDeleted( /** @type {!Node}*/child);

    key = getData(child).key;
    if (key) {
      delete keyMap[key];
    }
    child = node.lastChild;
  }

  // Clean the keyMap, removing any unusued keys.
  if (!keyMapValid) {
    for (key in keyMap) {
      child = keyMap[key];
      if (child.parentNode !== node) {
        context.markDeleted(child);
        delete keyMap[key];
      }
    }

    data.keyMapValid = true;
  }
};

/**
 * Changes to the first child of the current node.
 */
var enterNode = function () {
  currentParent = currentNode;
  currentNode = null;
};

/**
 * Changes to the next sibling of the current node.
 */
var nextNode = function () {
  if (currentNode) {
    currentNode = currentNode.nextSibling;
  } else {
    currentNode = currentParent.firstChild;
  }
};

/**
 * Changes to the parent of the current node, removing any unvisited children.
 */
var exitNode = function () {
  clearUnvisitedDOM();

  currentNode = currentParent;
  currentParent = currentParent.parentNode;
};

/**
 * Makes sure that the current node is an Element with a matching tagName and
 * key.
 *
 * @param {string} tag The element's tag.
 * @param {?string=} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @return {!Element} The corresponding Element.
 */
var coreElementOpen = function (tag, key, statics) {
  nextNode();
  alignWithDOM(tag, key, statics);
  enterNode();
  return (/** @type {!Element} */currentParent
  );
};

/**
 * Closes the currently open Element, removing any unvisited children if
 * necessary.
 *
 * @return {!Element} The corresponding Element.
 */
var coreElementClose = function () {
  if ('production' !== 'production') {}

  exitNode();
  return (/** @type {!Element} */currentNode
  );
};

/**
 * Makes sure the current node is a Text node and creates a Text node if it is
 * not.
 *
 * @return {!Text} The corresponding Text Node.
 */
var coreText = function () {
  nextNode();
  alignWithDOM('#text', null, null);
  return (/** @type {!Text} */currentNode
  );
};

/**
 * Gets the current Element being patched.
 * @return {!Element}
 */
var currentElement = function () {
  if ('production' !== 'production') {}
  return (/** @type {!Element} */currentParent
  );
};

/**
 * Skips the children in a subtree, allowing an Element to be closed without
 * clearing out the children.
 */
var skip = function () {
  if ('production' !== 'production') {}
  currentNode = currentParent.lastChild;
};

/**
 * The offset in the virtual element declaration where the attributes are
 * specified.
 * @const
 */
var ATTRIBUTES_OFFSET = 3;

/**
 * Builds an array of arguments for use with elementOpenStart, attr and
 * elementOpenEnd.
 * @const {Array<*>}
 */
var argsBuilder = [];

/**
 * @param {string} tag The element's tag.
 * @param {?string=} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @param {...*} const_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return {!Element} The corresponding Element.
 */
var elementOpen = function (tag, key, statics, const_args) {
  if ('production' !== 'production') {}

  var node = coreElementOpen(tag, key, statics);
  var data = getData(node);

  /*
   * Checks to see if one or more attributes have changed for a given Element.
   * When no attributes have changed, this is much faster than checking each
   * individual argument. When attributes have changed, the overhead of this is
   * minimal.
   */
  var attrsArr = data.attrsArr;
  var newAttrs = data.newAttrs;
  var attrsChanged = false;
  var i = ATTRIBUTES_OFFSET;
  var j = 0;

  for (; i < arguments.length; i += 1, j += 1) {
    if (attrsArr[j] !== arguments[i]) {
      attrsChanged = true;
      break;
    }
  }

  for (; i < arguments.length; i += 1, j += 1) {
    attrsArr[j] = arguments[i];
  }

  if (j < attrsArr.length) {
    attrsChanged = true;
    attrsArr.length = j;
  }

  /*
   * Actually perform the attribute update.
   */
  if (attrsChanged) {
    for (i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
      newAttrs[arguments[i]] = arguments[i + 1];
    }

    for (var _attr in newAttrs) {
      updateAttribute(node, _attr, newAttrs[_attr]);
      newAttrs[_attr] = undefined;
    }
  }

  return node;
};

/**
 * Declares a virtual Element at the current location in the document. This
 * corresponds to an opening tag and a elementClose tag is required. This is
 * like elementOpen, but the attributes are defined using the attr function
 * rather than being passed as arguments. Must be folllowed by 0 or more calls
 * to attr, then a call to elementOpenEnd.
 * @param {string} tag The element's tag.
 * @param {?string=} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 */
var elementOpenStart = function (tag, key, statics) {
  if ('production' !== 'production') {}

  argsBuilder[0] = tag;
  argsBuilder[1] = key;
  argsBuilder[2] = statics;
};

/***
 * Defines a virtual attribute at this point of the DOM. This is only valid
 * when called between elementOpenStart and elementOpenEnd.
 *
 * @param {string} name
 * @param {*} value
 */
var attr = function (name, value) {
  if ('production' !== 'production') {}

  argsBuilder.push(name, value);
};

/**
 * Closes an open tag started with elementOpenStart.
 * @return {!Element} The corresponding Element.
 */
var elementOpenEnd = function () {
  if ('production' !== 'production') {}

  var node = elementOpen.apply(null, argsBuilder);
  argsBuilder.length = 0;
  return node;
};

/**
 * Closes an open virtual Element.
 *
 * @param {string} tag The element's tag.
 * @return {!Element} The corresponding Element.
 */
var elementClose = function (tag) {
  if ('production' !== 'production') {}

  var node = coreElementClose();

  if ('production' !== 'production') {}

  return node;
};

/**
 * Declares a virtual Element at the current location in the document that has
 * no children.
 * @param {string} tag The element's tag.
 * @param {?string=} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @param {...*} const_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return {!Element} The corresponding Element.
 */
var elementVoid = function (tag, key, statics, const_args) {
  elementOpen.apply(null, arguments);
  return elementClose(tag);
};

/**
 * Declares a virtual Element at the current location in the document that is a
 * placeholder element. Children of this Element can be manually managed and
 * will not be cleared by the library.
 *
 * A key must be specified to make sure that this node is correctly preserved
 * across all conditionals.
 *
 * @param {string} tag The element's tag.
 * @param {string} key The key used to identify this element.
 * @param {?Array<*>=} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @param {...*} const_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return {!Element} The corresponding Element.
 */
var elementPlaceholder = function (tag, key, statics, const_args) {
  if ('production' !== 'production') {}

  elementOpen.apply(null, arguments);
  skip();
  return elementClose(tag);
};

/**
 * Declares a virtual Text at this point in the document.
 *
 * @param {string|number|boolean} value The value of the Text.
 * @param {...(function((string|number|boolean)):string)} const_args
 *     Functions to format the value which are called only when the value has
 *     changed.
 * @return {!Text} The corresponding text node.
 */
var text = function (value, const_args) {
  if ('production' !== 'production') {}

  var node = coreText();
  var data = getData(node);

  if (data.text !== value) {
    data.text = /** @type {string} */value;

    var formatted = value;
    for (var i = 1; i < arguments.length; i += 1) {
      /*
       * Call the formatter function directly to prevent leaking arguments.
       * https://github.com/google/incremental-dom/pull/204#issuecomment-178223574
       */
      var fn = arguments[i];
      formatted = fn(formatted);
    }

    node.data = formatted;
  }

  return node;
};

exports.patch = patchInner;
exports.patchInner = patchInner;
exports.patchOuter = patchOuter;
exports.currentElement = currentElement;
exports.skip = skip;
exports.elementVoid = elementVoid;
exports.elementOpenStart = elementOpenStart;
exports.elementOpenEnd = elementOpenEnd;
exports.elementOpen = elementOpen;
exports.elementClose = elementClose;
exports.elementPlaceholder = elementPlaceholder;
exports.text = text;
exports.attr = attr;
exports.symbols = symbols;
exports.attributes = attributes;
exports.applyAttr = applyAttr;
exports.applyProp = applyProp;
exports.notifications = notifications;


},{}],3:[function(require,module,exports){
(function (process){
// Generated by psc-bundle 0.9.3
var PS = {};
(function(exports) {
    "use strict";

  exports.foldrArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = len - 1; i >= 0; i--) {
          acc = f(xs[i])(acc);
        }
        return acc;
      };
    };
  };

  exports.foldlArray = function (f) {
    return function (init) {
      return function (xs) {
        var acc = init;
        var len = xs.length;
        for (var i = 0; i < len; i++) {
          acc = f(acc)(xs[i]);
        }
        return acc;
      };
    };
  };
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
    "use strict";

  // module Data.Functor

  exports.arrayMap = function (f) {
    return function (arr) {
      var l = arr.length;
      var result = new Array(l);
      for (var i = 0; i < l; i++) {
        result[i] = f(arr[i]);
      }
      return result;
    };
  };
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Semigroupoid = function (compose) {
      this.compose = compose;
  };
  var semigroupoidFn = new Semigroupoid(function (f) {
      return function (g) {
          return function (x) {
              return f(g(x));
          };
      };
  });
  var compose = function (dict) {
      return dict.compose;
  };
  var composeFlipped = function (dictSemigroupoid) {
      return function (f) {
          return function (g) {
              return compose(dictSemigroupoid)(g)(f);
          };
      };
  };
  exports["Semigroupoid"] = Semigroupoid;
  exports["compose"] = compose;
  exports["composeFlipped"] = composeFlipped;
  exports["semigroupoidFn"] = semigroupoidFn;
})(PS["Control.Semigroupoid"] = PS["Control.Semigroupoid"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Category = function (__superclass_Control$dotSemigroupoid$dotSemigroupoid_0, id) {
      this["__superclass_Control.Semigroupoid.Semigroupoid_0"] = __superclass_Control$dotSemigroupoid$dotSemigroupoid_0;
      this.id = id;
  };
  var id = function (dict) {
      return dict.id;
  };
  var categoryFn = new Category(function () {
      return Control_Semigroupoid.semigroupoidFn;
  }, function (x) {
      return x;
  });
  exports["Category"] = Category;
  exports["id"] = id;
  exports["categoryFn"] = categoryFn;
})(PS["Control.Category"] = PS["Control.Category"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Category = PS["Control.Category"];
  var flip = function (f) {
      return function (b) {
          return function (a) {
              return f(a)(b);
          };
      };
  };
  var $$const = function (a) {
      return function (v) {
          return a;
      };
  };
  var applyFlipped = function (x) {
      return function (f) {
          return f(x);
      };
  };
  var apply = function (f) {
      return function (x) {
          return f(x);
      };
  };
  exports["apply"] = apply;
  exports["applyFlipped"] = applyFlipped;
  exports["const"] = $$const;
  exports["flip"] = flip;
})(PS["Data.Function"] = PS["Data.Function"] || {});
(function(exports) {
    "use strict";

  // module Data.Unit

  exports.unit = {};
})(PS["Data.Unit"] = PS["Data.Unit"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Unit"];
  var Data_Show = PS["Data.Show"];
  exports["unit"] = $foreign.unit;
})(PS["Data.Unit"] = PS["Data.Unit"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Functor = function (map) {
      this.map = map;
  };
  var map = function (dict) {
      return dict.map;
  };
  var mapFlipped = function (dictFunctor) {
      return function (fa) {
          return function (f) {
              return map(dictFunctor)(f)(fa);
          };
      };
  };
  var functorFn = new Functor(Control_Semigroupoid.compose(Control_Semigroupoid.semigroupoidFn));
  var functorArray = new Functor($foreign.arrayMap);
  exports["Functor"] = Functor;
  exports["map"] = map;
  exports["mapFlipped"] = mapFlipped;
  exports["functorFn"] = functorFn;
  exports["functorArray"] = functorArray;
})(PS["Data.Functor"] = PS["Data.Functor"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Function = PS["Data.Function"];
  var Control_Category = PS["Control.Category"];        
  var Apply = function (__superclass_Data$dotFunctor$dotFunctor_0, apply) {
      this["__superclass_Data.Functor.Functor_0"] = __superclass_Data$dotFunctor$dotFunctor_0;
      this.apply = apply;
  };                      
  var apply = function (dict) {
      return dict.apply;
  };
  var applySecond = function (dictApply) {
      return function (a) {
          return function (b) {
              return apply(dictApply)(Data_Functor.map(dictApply["__superclass_Data.Functor.Functor_0"]())(Data_Function["const"](Control_Category.id(Control_Category.categoryFn)))(a))(b);
          };
      };
  };
  exports["Apply"] = Apply;
  exports["apply"] = apply;
  exports["applySecond"] = applySecond;
})(PS["Control.Apply"] = PS["Control.Apply"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];        
  var Applicative = function (__superclass_Control$dotApply$dotApply_0, pure) {
      this["__superclass_Control.Apply.Apply_0"] = __superclass_Control$dotApply$dotApply_0;
      this.pure = pure;
  };
  var pure = function (dict) {
      return dict.pure;
  };
  var liftA1 = function (dictApplicative) {
      return function (f) {
          return function (a) {
              return Control_Apply.apply(dictApplicative["__superclass_Control.Apply.Apply_0"]())(pure(dictApplicative)(f))(a);
          };
      };
  };
  exports["Applicative"] = Applicative;
  exports["liftA1"] = liftA1;
  exports["pure"] = pure;
})(PS["Control.Applicative"] = PS["Control.Applicative"] || {});
(function(exports) {
    "use strict";

  exports.concatArray = function (xs) {
    return function (ys) {
      return xs.concat(ys);
    };
  };
})(PS["Data.Semigroup"] = PS["Data.Semigroup"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Semigroup"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];        
  var Semigroup = function (append) {
      this.append = append;
  };                                                         
  var semigroupArray = new Semigroup($foreign.concatArray);
  var append = function (dict) {
      return dict.append;
  };
  exports["Semigroup"] = Semigroup;
  exports["append"] = append;
  exports["semigroupArray"] = semigroupArray;
})(PS["Data.Semigroup"] = PS["Data.Semigroup"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Data_Functor = PS["Data.Functor"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var Alt = function (__superclass_Data$dotFunctor$dotFunctor_0, alt) {
      this["__superclass_Data.Functor.Functor_0"] = __superclass_Data$dotFunctor$dotFunctor_0;
      this.alt = alt;
  };
  var altArray = new Alt(function () {
      return Data_Functor.functorArray;
  }, Data_Semigroup.append(Data_Semigroup.semigroupArray));
  var alt = function (dict) {
      return dict.alt;
  };
  exports["Alt"] = Alt;
  exports["alt"] = alt;
  exports["altArray"] = altArray;
})(PS["Control.Alt"] = PS["Control.Alt"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Alt = PS["Control.Alt"];
  var Data_Functor = PS["Data.Functor"];        
  var Plus = function (__superclass_Control$dotAlt$dotAlt_0, empty) {
      this["__superclass_Control.Alt.Alt_0"] = __superclass_Control$dotAlt$dotAlt_0;
      this.empty = empty;
  };
  var plusArray = new Plus(function () {
      return Control_Alt.altArray;
  }, [  ]);
  var empty = function (dict) {
      return dict.empty;
  };
  exports["Plus"] = Plus;
  exports["empty"] = empty;
  exports["plusArray"] = plusArray;
})(PS["Control.Plus"] = PS["Control.Plus"] || {});
(function(exports) {
    "use strict";

  // module Data.Eq

  exports.refEq = function (r1) {
    return function (r2) {
      return r1 === r2;
    };
  };
})(PS["Data.Eq"] = PS["Data.Eq"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Eq"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];        
  var Eq = function (eq) {
      this.eq = eq;
  };                                    
  var eqNumber = new Eq($foreign.refEq);
  var eqInt = new Eq($foreign.refEq);    
  var eq = function (dict) {
      return dict.eq;
  };
  exports["Eq"] = Eq;
  exports["eq"] = eq;
  exports["eqInt"] = eqInt;
  exports["eqNumber"] = eqNumber;
})(PS["Data.Eq"] = PS["Data.Eq"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Category = PS["Control.Category"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];        
  var Bind = function (__superclass_Control$dotApply$dotApply_0, bind) {
      this["__superclass_Control.Apply.Apply_0"] = __superclass_Control$dotApply$dotApply_0;
      this.bind = bind;
  };                     
  var bind = function (dict) {
      return dict.bind;
  };
  exports["Bind"] = Bind;
  exports["bind"] = bind;
})(PS["Control.Bind"] = PS["Control.Bind"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Functor = PS["Data.Functor"];        
  var Monad = function (__superclass_Control$dotApplicative$dotApplicative_0, __superclass_Control$dotBind$dotBind_1) {
      this["__superclass_Control.Applicative.Applicative_0"] = __superclass_Control$dotApplicative$dotApplicative_0;
      this["__superclass_Control.Bind.Bind_1"] = __superclass_Control$dotBind$dotBind_1;
  };
  var ap = function (dictMonad) {
      return function (f) {
          return function (a) {
              return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(f)(function (v) {
                  return Control_Bind.bind(dictMonad["__superclass_Control.Bind.Bind_1"]())(a)(function (v1) {
                      return Control_Applicative.pure(dictMonad["__superclass_Control.Applicative.Applicative_0"]())(v(v1));
                  });
              });
          };
      };
  };
  exports["Monad"] = Monad;
  exports["ap"] = ap;
})(PS["Control.Monad"] = PS["Control.Monad"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Data_Function = PS["Data.Function"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Unit = PS["Data.Unit"];        
  var Monoid = function (__superclass_Data$dotSemigroup$dotSemigroup_0, mempty) {
      this["__superclass_Data.Semigroup.Semigroup_0"] = __superclass_Data$dotSemigroup$dotSemigroup_0;
      this.mempty = mempty;
  };       
  var mempty = function (dict) {
      return dict.mempty;
  };
  exports["Monoid"] = Monoid;
  exports["mempty"] = mempty;
})(PS["Data.Monoid"] = PS["Data.Monoid"] || {});
(function(exports) {
    "use strict";

  // module Data.Ord.Unsafe

  exports.unsafeCompareImpl = function (lt) {
    return function (eq) {
      return function (gt) {
        return function (x) {
          return function (y) {
            return x < y ? lt : x > y ? gt : eq;
          };
        };
      };
    };
  };
})(PS["Data.Ord.Unsafe"] = PS["Data.Ord.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Data_Eq = PS["Data.Eq"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];        
  var LT = (function () {
      function LT() {

      };
      LT.value = new LT();
      return LT;
  })();
  var GT = (function () {
      function GT() {

      };
      GT.value = new GT();
      return GT;
  })();
  var EQ = (function () {
      function EQ() {

      };
      EQ.value = new EQ();
      return EQ;
  })();
  exports["LT"] = LT;
  exports["GT"] = GT;
  exports["EQ"] = EQ;
})(PS["Data.Ordering"] = PS["Data.Ordering"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Ord.Unsafe"];
  var Data_Ordering = PS["Data.Ordering"];        
  var unsafeCompare = $foreign.unsafeCompareImpl(Data_Ordering.LT.value)(Data_Ordering.EQ.value)(Data_Ordering.GT.value);
  exports["unsafeCompare"] = unsafeCompare;
})(PS["Data.Ord.Unsafe"] = PS["Data.Ord.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Ord"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Ord_Unsafe = PS["Data.Ord.Unsafe"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Void = PS["Data.Void"];
  var Data_Semiring = PS["Data.Semiring"];        
  var Ord = function (__superclass_Data$dotEq$dotEq_0, compare) {
      this["__superclass_Data.Eq.Eq_0"] = __superclass_Data$dotEq$dotEq_0;
      this.compare = compare;
  }; 
  var ordNumber = new Ord(function () {
      return Data_Eq.eqNumber;
  }, Data_Ord_Unsafe.unsafeCompare);
  var ordInt = new Ord(function () {
      return Data_Eq.eqInt;
  }, Data_Ord_Unsafe.unsafeCompare);
  var compare = function (dict) {
      return dict.compare;
  };
  var max = function (dictOrd) {
      return function (x) {
          return function (y) {
              var $27 = compare(dictOrd)(x)(y);
              if ($27 instanceof Data_Ordering.LT) {
                  return y;
              };
              if ($27 instanceof Data_Ordering.EQ) {
                  return x;
              };
              if ($27 instanceof Data_Ordering.GT) {
                  return x;
              };
              throw new Error("Failed pattern match at Data.Ord line 122, column 3 - line 125, column 12: " + [ $27.constructor.name ]);
          };
      };
  };
  var min = function (dictOrd) {
      return function (x) {
          return function (y) {
              var $28 = compare(dictOrd)(x)(y);
              if ($28 instanceof Data_Ordering.LT) {
                  return x;
              };
              if ($28 instanceof Data_Ordering.EQ) {
                  return x;
              };
              if ($28 instanceof Data_Ordering.GT) {
                  return y;
              };
              throw new Error("Failed pattern match at Data.Ord line 113, column 3 - line 116, column 12: " + [ $28.constructor.name ]);
          };
      };
  };
  exports["Ord"] = Ord;
  exports["compare"] = compare;
  exports["max"] = max;
  exports["min"] = min;
  exports["ordInt"] = ordInt;
  exports["ordNumber"] = ordNumber;
})(PS["Data.Ord"] = PS["Data.Ord"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad = PS["Control.Monad"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Category = PS["Control.Category"];        
  var Just = (function () {
      function Just(value0) {
          this.value0 = value0;
      };
      Just.create = function (value0) {
          return new Just(value0);
      };
      return Just;
  })();
  var Nothing = (function () {
      function Nothing() {

      };
      Nothing.value = new Nothing();
      return Nothing;
  })();
  var maybe = function (v) {
      return function (v1) {
          return function (v2) {
              if (v2 instanceof Nothing) {
                  return v;
              };
              if (v2 instanceof Just) {
                  return v1(v2.value0);
              };
              throw new Error("Failed pattern match at Data.Maybe line 232, column 1 - line 232, column 22: " + [ v.constructor.name, v1.constructor.name, v2.constructor.name ]);
          };
      };
  };
  var fromMaybe = function (a) {
      return maybe(a)(Control_Category.id(Control_Category.categoryFn));
  };
  var fromJust = function (dictPartial) {
      return function (v) {
          var __unused = function (dictPartial1) {
              return function ($dollar29) {
                  return $dollar29;
              };
          };
          return __unused(dictPartial)((function () {
              if (v instanceof Just) {
                  return v.value0;
              };
              throw new Error("Failed pattern match at Data.Maybe line 283, column 1 - line 283, column 21: " + [ v.constructor.name ]);
          })());
      };
  };
  exports["Just"] = Just;
  exports["Nothing"] = Nothing;
  exports["fromJust"] = fromJust;
  exports["fromMaybe"] = fromMaybe;
  exports["maybe"] = maybe;
})(PS["Data.Maybe"] = PS["Data.Maybe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Show = PS["Data.Show"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var First = function (x) {
      return x;
  };
  var semigroupFirst = new Data_Semigroup.Semigroup(function (v) {
      return function (v1) {
          if (v instanceof Data_Maybe.Just) {
              return v;
          };
          return v1;
      };
  });
  var runFirst = function (v) {
      return v;
  };
  var monoidFirst = new Data_Monoid.Monoid(function () {
      return semigroupFirst;
  }, Data_Maybe.Nothing.value);
  exports["First"] = First;
  exports["runFirst"] = runFirst;
  exports["semigroupFirst"] = semigroupFirst;
  exports["monoidFirst"] = monoidFirst;
})(PS["Data.Maybe.First"] = PS["Data.Maybe.First"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Foldable"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Plus = PS["Control.Plus"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Maybe_Last = PS["Data.Maybe.Last"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Monoid_Additive = PS["Data.Monoid.Additive"];
  var Data_Monoid_Conj = PS["Data.Monoid.Conj"];
  var Data_Monoid_Disj = PS["Data.Monoid.Disj"];
  var Data_Monoid_Dual = PS["Data.Monoid.Dual"];
  var Data_Monoid_Endo = PS["Data.Monoid.Endo"];
  var Data_Monoid_Multiplicative = PS["Data.Monoid.Multiplicative"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Category = PS["Control.Category"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];        
  var Foldable = function (foldMap, foldl, foldr) {
      this.foldMap = foldMap;
      this.foldl = foldl;
      this.foldr = foldr;
  };
  var foldr = function (dict) {
      return dict.foldr;
  };
  var traverse_ = function (dictApplicative) {
      return function (dictFoldable) {
          return function (f) {
              return foldr(dictFoldable)(function ($164) {
                  return Control_Apply.applySecond(dictApplicative["__superclass_Control.Apply.Apply_0"]())(f($164));
              })(Control_Applicative.pure(dictApplicative)(Data_Unit.unit));
          };
      };
  };
  var foldl = function (dict) {
      return dict.foldl;
  }; 
  var foldableMaybe = new Foldable(function (dictMonoid) {
      return function (f) {
          return function (v) {
              if (v instanceof Data_Maybe.Nothing) {
                  return Data_Monoid.mempty(dictMonoid);
              };
              if (v instanceof Data_Maybe.Just) {
                  return f(v.value0);
              };
              throw new Error("Failed pattern match at Data.Foldable line 132, column 3 - line 132, column 30: " + [ f.constructor.name, v.constructor.name ]);
          };
      };
  }, function (v) {
      return function (z) {
          return function (v1) {
              if (v1 instanceof Data_Maybe.Nothing) {
                  return z;
              };
              if (v1 instanceof Data_Maybe.Just) {
                  return v(z)(v1.value0);
              };
              throw new Error("Failed pattern match at Data.Foldable line 130, column 3 - line 130, column 25: " + [ v.constructor.name, z.constructor.name, v1.constructor.name ]);
          };
      };
  }, function (v) {
      return function (z) {
          return function (v1) {
              if (v1 instanceof Data_Maybe.Nothing) {
                  return z;
              };
              if (v1 instanceof Data_Maybe.Just) {
                  return v(v1.value0)(z);
              };
              throw new Error("Failed pattern match at Data.Foldable line 128, column 3 - line 128, column 25: " + [ v.constructor.name, z.constructor.name, v1.constructor.name ]);
          };
      };
  });
  var foldMapDefaultR = function (dictFoldable) {
      return function (dictMonoid) {
          return function (f) {
              return function (xs) {
                  return foldr(dictFoldable)(function (x) {
                      return function (acc) {
                          return Data_Semigroup.append(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(f(x))(acc);
                      };
                  })(Data_Monoid.mempty(dictMonoid))(xs);
              };
          };
      };
  };
  var foldableArray = new Foldable(function (dictMonoid) {
      return foldMapDefaultR(foldableArray)(dictMonoid);
  }, $foreign.foldlArray, $foreign.foldrArray);
  var foldMap = function (dict) {
      return dict.foldMap;
  };
  var fold = function (dictFoldable) {
      return function (dictMonoid) {
          return foldMap(dictFoldable)(dictMonoid)(Control_Category.id(Control_Category.categoryFn));
      };
  };
  exports["Foldable"] = Foldable;
  exports["fold"] = fold;
  exports["foldMap"] = foldMap;
  exports["foldMapDefaultR"] = foldMapDefaultR;
  exports["foldl"] = foldl;
  exports["foldr"] = foldr;
  exports["traverse_"] = traverse_;
  exports["foldableArray"] = foldableArray;
  exports["foldableMaybe"] = foldableMaybe;
})(PS["Data.Foldable"] = PS["Data.Foldable"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Biapplicative = PS["Control.Biapplicative"];
  var Control_Biapply = PS["Control.Biapply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Bifoldable = PS["Data.Bifoldable"];
  var Data_Bifunctor = PS["Data.Bifunctor"];
  var Data_Bitraversable = PS["Data.Bitraversable"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Functor_Invariant = PS["Data.Functor.Invariant"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_CommutativeRing = PS["Data.CommutativeRing"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Show = PS["Data.Show"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Unit = PS["Data.Unit"];        
  var Tuple = (function () {
      function Tuple(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Tuple.create = function (value0) {
          return function (value1) {
              return new Tuple(value0, value1);
          };
      };
      return Tuple;
  })();
  var snd = function (v) {
      return v.value1;
  };
  exports["Tuple"] = Tuple;
  exports["snd"] = snd;
})(PS["Data.Tuple"] = PS["Data.Tuple"] || {});
(function(exports) {
    "use strict";

  // module Partial.Unsafe

  exports.unsafePartial = function (f) {
    return f();
  };
})(PS["Partial.Unsafe"] = PS["Partial.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Partial.Unsafe"];
  var Partial = PS["Partial"];
  exports["unsafePartial"] = $foreign.unsafePartial;
})(PS["Partial.Unsafe"] = PS["Partial.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Unfoldable"];
  var Prelude = PS["Prelude"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Function = PS["Data.Function"];
  var Data_Unit = PS["Data.Unit"];        
  var Unfoldable = function (unfoldr) {
      this.unfoldr = unfoldr;
  };
  var unfoldr = function (dict) {
      return dict.unfoldr;
  };
  exports["Unfoldable"] = Unfoldable;
  exports["unfoldr"] = unfoldr;
})(PS["Data.Unfoldable"] = PS["Data.Unfoldable"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var otherwise = true;
  exports["otherwise"] = otherwise;
})(PS["Data.Boolean"] = PS["Data.Boolean"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Control_MonadPlus = PS["Control.MonadPlus"];
  var Control_MonadZero = PS["Control.MonadZero"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Generic = PS["Data.Generic"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Control_Category = PS["Control.Category"];        
  var Nil = (function () {
      function Nil() {

      };
      Nil.value = new Nil();
      return Nil;
  })();
  var Cons = (function () {
      function Cons(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Cons.create = function (value0) {
          return function (value1) {
              return new Cons(value0, value1);
          };
      };
      return Cons;
  })();
  var reverse = (function () {
      var go = function (__copy_acc) {
          return function (__copy_v) {
              var acc = __copy_acc;
              var v = __copy_v;
              tco: while (true) {
                  if (v instanceof Nil) {
                      return acc;
                  };
                  if (v instanceof Cons) {
                      var __tco_acc = new Cons(v.value0, acc);
                      var __tco_v = v.value1;
                      acc = __tco_acc;
                      v = __tco_v;
                      continue tco;
                  };
                  throw new Error("Failed pattern match at Data.List line 346, column 1 - line 349, column 42: " + [ acc.constructor.name, v.constructor.name ]);
              };
          };
      };
      return go(Nil.value);
  })();
  var unfoldableList = new Data_Unfoldable.Unfoldable(function (f) {
      return function (b) {
          var go = function (__copy_source) {
              return function (__copy_memo) {
                  var source = __copy_source;
                  var memo = __copy_memo;
                  tco: while (true) {
                      var $192 = f(source);
                      if ($192 instanceof Data_Maybe.Nothing) {
                          return reverse(memo);
                      };
                      if ($192 instanceof Data_Maybe.Just) {
                          var __tco_memo = new Cons($192.value0.value0, memo);
                          source = $192.value0.value1;
                          memo = __tco_memo;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.List line 743, column 24 - line 745, column 57: " + [ $192.constructor.name ]);
                  };
              };
          };
          return go(b)(Nil.value);
      };
  });           
  var mapWithIndex = function (f) {
      return function (lst) {
          var go = function (v) {
              return function (v1) {
                  return function (acc) {
                      if (v1 instanceof Nil) {
                          return acc;
                      };
                      if (v1 instanceof Cons) {
                          return Data_Function.apply(go(v + 1 | 0)(v1.value1))(new Cons(f(v1.value0)(v), acc));
                      };
                      throw new Error("Failed pattern match at Data.List line 412, column 1 - line 415, column 56: " + [ v.constructor.name, v1.constructor.name, acc.constructor.name ]);
                  };
              };
          };
          return Data_Function.apply(reverse)(go(0)(lst)(Nil.value));
      };
  };
  var functorList = new Data_Functor.Functor(function (f) {
      return function (lst) {
          var go = function (v) {
              return function (acc) {
                  if (v instanceof Nil) {
                      return acc;
                  };
                  if (v instanceof Cons) {
                      return Data_Function.apply(go(v.value1))(new Cons(f(v.value0), acc));
                  };
                  throw new Error("Failed pattern match at Data.List line 726, column 3 - line 729, column 48: " + [ v.constructor.name, acc.constructor.name ]);
              };
          };
          return Data_Function.apply(reverse)(go(lst)(Nil.value));
      };
  });
  var foldableList = new Data_Foldable.Foldable(function (dictMonoid) {
      return function (f) {
          return Data_Foldable.foldl(foldableList)(function (acc) {
              return function ($387) {
                  return Data_Semigroup.append(dictMonoid["__superclass_Data.Semigroup.Semigroup_0"]())(acc)(f($387));
              };
          })(Data_Monoid.mempty(dictMonoid));
      };
  }, (function () {
      var go = function (__copy_v) {
          return function (__copy_b) {
              return function (__copy_v1) {
                  var v = __copy_v;
                  var b = __copy_b;
                  var v1 = __copy_v1;
                  tco: while (true) {
                      if (v1 instanceof Nil) {
                          return b;
                      };
                      if (v1 instanceof Cons) {
                          var __tco_v = v;
                          var __tco_b = v(b)(v1.value0);
                          var __tco_v1 = v1.value1;
                          v = __tco_v;
                          b = __tco_b;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.List line 734, column 3 - line 737, column 49: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
                  };
              };
          };
      };
      return go;
  })(), function (v) {
      return function (b) {
          return function (v1) {
              if (v1 instanceof Nil) {
                  return b;
              };
              if (v1 instanceof Cons) {
                  return v(v1.value0)(Data_Foldable.foldr(foldableList)(v)(b)(v1.value1));
              };
              throw new Error("Failed pattern match at Data.List line 732, column 3 - line 732, column 20: " + [ v.constructor.name, b.constructor.name, v1.constructor.name ]);
          };
      };
  });
  exports["Nil"] = Nil;
  exports["Cons"] = Cons;
  exports["mapWithIndex"] = mapWithIndex;
  exports["reverse"] = reverse;
  exports["functorList"] = functorList;
  exports["foldableList"] = foldableList;
  exports["unfoldableList"] = unfoldableList;
})(PS["Data.List"] = PS["Data.List"] || {});
(function(exports) {
  /* globals exports */
  "use strict";         

  exports.infinity = Infinity;
})(PS["Global"] = PS["Global"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Global"];
  exports["infinity"] = $foreign.infinity;
})(PS["Global"] = PS["Global"] || {});
(function(exports) {
    "use strict";

  exports.toNumber = function (n) {
    return n;
  };
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {
    "use strict";

  exports.pow = function (n) {
    return function (p) {
      return Math.pow(n, p);
    };
  };                     

  exports.sqrt = Math.sqrt;
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Math"];
  exports["pow"] = $foreign.pow;
  exports["sqrt"] = $foreign.sqrt;
})(PS["Math"] = PS["Math"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Int"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_BooleanAlgebra = PS["Data.BooleanAlgebra"];
  var Data_Bounded = PS["Data.Bounded"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  var Data_Int_Bits = PS["Data.Int.Bits"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Ord = PS["Data.Ord"];
  var $$Math = PS["Math"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  exports["toNumber"] = $foreign.toNumber;
})(PS["Data.Int"] = PS["Data.Int"] || {});
(function(exports) {

  exports.mousePosP =
    function mousePosP(constant) {
      var out = constant({x:0,y:0});
      window.addEventListener('mousemove', function(e) {
        if (e.pageX !== undefined && e.pageY !== undefined) {
          out.set({x: e.pageX, y: e.pageY});
        } else if (e.clientX !== undefined && e.clientY !== undefined) {
          out.set({
            x: e.clientX + document.body.scrollLeft +
               document.documentElement.scrollLeft,
            y: e.clientY + document.body.scrollTop +
               document.documentElement.scrollTop
          });
        } else {
          throw new Error('Mouse event has no coordinates I recognise!');
        }
      });
      return function() {
        return out;
      };
    };

  exports.animationFrameP =
    function animationFrameP(constant) {
      return function(now) {
        return function() {
          var requestAnimFrame, cancelAnimFrame;
          if (window.requestAnimationFrame) {
            requestAnimFrame = window.requestAnimationFrame;
            cancelAnimFrame = window.cancelAnimationFrame;
          } else if (window.mozRequestAnimationFrame) {
            requestAnimFrame = window.mozRequestAnimationFrame;
            cancelAnimFrame = window.mozCancelAnimationFrame;
          } else if (window.webkitRequestAnimationFrame) {
            requestAnimFrame = window.webkitRequestAnimationFrame;
            cancelAnimFrame = window.webkitCancelAnimationFrame;
          } else if (window.msRequestAnimationFrame) {
            requestAnimFrame = window.msRequestAnimationFrame;
            cancelAnimFrame = window.msCancelAnimationFrame;
          } else if (window.oRequestAnimationFrame) {
            requestAnimFrame = window.oRequestAnimationFrame;
            cancelAnimFrame = window.oCancelAnimationFrame;
          } else {
            requestAnimFrame = function(cb) {setTimeout(function() {cb(now())}, 1000/60)};
            cancelAnimFrame = window.clearTimeout;
          }
          var out = constant(now());
          requestAnimFrame(function tick(t) {
            out.set(t); requestAnimFrame(tick);
          });
          return out;
        };
      };
    };
})(PS["Signal.DOM"] = PS["Signal.DOM"] || {});
(function(exports) {
    "use strict";

  // module Control.Monad.Eff

  exports.pureE = function (a) {
    return function () {
      return a;
    };
  };

  exports.bindE = function (a) {
    return function (f) {
      return function () {
        return f(a())();
      };
    };
  };

  exports.runPure = function (f) {
    return f();
  };
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Control.Monad.Eff"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Unit = PS["Data.Unit"];        
  var monadEff = new Control_Monad.Monad(function () {
      return applicativeEff;
  }, function () {
      return bindEff;
  });
  var bindEff = new Control_Bind.Bind(function () {
      return applyEff;
  }, $foreign.bindE);
  var applyEff = new Control_Apply.Apply(function () {
      return functorEff;
  }, Control_Monad.ap(monadEff));
  var applicativeEff = new Control_Applicative.Applicative(function () {
      return applyEff;
  }, $foreign.pureE);
  var functorEff = new Data_Functor.Functor(Control_Applicative.liftA1(applicativeEff));
  exports["functorEff"] = functorEff;
  exports["applyEff"] = applyEff;
  exports["applicativeEff"] = applicativeEff;
  exports["bindEff"] = bindEff;
  exports["monadEff"] = monadEff;
  exports["runPure"] = $foreign.runPure;
})(PS["Control.Monad.Eff"] = PS["Control.Monad.Eff"] || {});
(function(exports) {// module Signal

  function make(initial) {
    var subs = [];
    var val = initial;
    var sig = {
      subscribe: function(sub) {
        subs.push(sub);
        sub(val);
      },
      get: function() { return val; },
      set: function(newval) {
        val = newval;
        subs.forEach(function(sub) { sub(newval); });
      }
    };
    return sig;
  };

  exports.constant = make;

  exports.mapSig = function(fun) {
    return function(sig) {
      var out = make(fun(sig.get()));
      sig.subscribe(function(val) { out.set(fun(val)); });
      return out;
    };
  };


  exports.applySig = function(fun) {
    return function(sig) {
      var out = make(fun.get()(sig.get()));
      var produce = function() { out.set(fun.get()(sig.get())); };
      fun.subscribe(produce);
      sig.subscribe(produce);
      return out;
    };
  };

  exports.foldp = function(fun) {
    return function(seed) {
      return function(sig) {
        var acc = seed;
        var out = make(acc);
        sig.subscribe(function(val) {
          acc = fun(val)(acc);
          out.set(acc);
        });
        return out;
      };
    };
  };

  exports.sampleOn = function(sig1) {
    return function(sig2) {
      var out = make(sig2.get());
      sig1.subscribe(function() {
        out.set(sig2.get());
      });
      return out;
    };
  };

  exports.runSignal =
    function runSignal(sig) {
      return function() {
        sig.subscribe(function(val) {
          val();
        });
        return {};
      };
    };
})(PS["Signal"] = PS["Signal"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Signal"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Function = PS["Data.Function"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Monoid = PS["Data.Monoid"];        
  var squigglyMap = function (dictFunctor) {
      return Data_Functor.map(dictFunctor);
  };
  var squigglyApply = function (dictApply) {
      return Control_Apply.apply(dictApply);
  };
  var functorSignal = new Data_Functor.Functor($foreign.mapSig);
  var applySignal = new Control_Apply.Apply(function () {
      return functorSignal;
  }, $foreign.applySig);
  exports["squigglyApply"] = squigglyApply;
  exports["squigglyMap"] = squigglyMap;
  exports["functorSignal"] = functorSignal;
  exports["applySignal"] = applySignal;
  exports["constant"] = $foreign.constant;
  exports["foldp"] = $foreign.foldp;
  exports["runSignal"] = $foreign.runSignal;
  exports["sampleOn"] = $foreign.sampleOn;
})(PS["Signal"] = PS["Signal"] || {});
(function(exports) {// module Signal.Time

  function now() {
    var perf = typeof performance !== 'undefined' ? performance : null,
        proc = typeof process !== 'undefined' ? process : null;
    return (
      perf && (perf.now || perf.webkitNow || perf.msNow || perf.oNow || perf.mozNow) ||
      (proc && proc.hrtime && function() {
        var t = proc.hrtime();
        return (t[0] * 1e9 + t[1]) / 1e6;
      }) ||
      Date.now
    ).call(perf);
  };

  exports.now = now;
})(PS["Signal.Time"] = PS["Signal.Time"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Signal.Time"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Timer = PS["Control.Monad.Eff.Timer"];
  var Signal = PS["Signal"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Function = PS["Data.Function"];
  exports["now"] = $foreign.now;
})(PS["Signal.Time"] = PS["Signal.Time"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Signal.DOM"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Timer = PS["Control.Monad.Eff.Timer"];
  var DOM = PS["DOM"];
  var Prelude = PS["Prelude"];
  var Signal = PS["Signal"];
  var Signal_Time = PS["Signal.Time"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];
  var mousePos = $foreign.mousePosP(Signal.constant);    
  var animationFrame = $foreign.animationFrameP(Signal.constant)(Signal_Time.now);
  exports["animationFrame"] = animationFrame;
  exports["mousePos"] = mousePos;
})(PS["Signal.DOM"] = PS["Signal.DOM"] || {});
(function(exports) {
  /* globals exports, JSON */
  "use strict";

  exports.unsafeToFixed = function (digits) {
    return function (n) {
      return n.toFixed(digits);
    };
  };
})(PS["Global.Unsafe"] = PS["Global.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Global.Unsafe"];
  exports["unsafeToFixed"] = $foreign.unsafeToFixed;
})(PS["Global.Unsafe"] = PS["Global.Unsafe"] || {});
(function(exports) {
    "use strict";

  // module Control.Monad.Eff.Unsafe

  exports.unsafeInterleaveEff = function (f) {
    return f;
  };
})(PS["Control.Monad.Eff.Unsafe"] = PS["Control.Monad.Eff.Unsafe"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Unsafe"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var unsafePerformEff = function ($0) {
      return Control_Monad_Eff.runPure($foreign.unsafeInterleaveEff($0));
  };
  exports["unsafePerformEff"] = unsafePerformEff;
})(PS["Control.Monad.Eff.Unsafe"] = PS["Control.Monad.Eff.Unsafe"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Control.Monad.Eff.Random

  exports.random = Math.random;
})(PS["Control.Monad.Eff.Random"] = PS["Control.Monad.Eff.Random"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Control.Monad.Eff.Random"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Int = PS["Data.Int"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Ord = PS["Data.Ord"];
  exports["random"] = $foreign.random;
})(PS["Control.Monad.Eff.Random"] = PS["Control.Monad.Eff.Random"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Global_Unsafe = PS["Global.Unsafe"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Control_Monad_Eff_Unsafe = PS["Control.Monad.Eff.Unsafe"];
  var Control_Monad_Eff_Random = PS["Control.Monad.Eff.Random"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_Eq = PS["Data.Eq"];        
  var jiggleD = function (i) {
      return (i + Control_Monad_Eff_Unsafe.unsafePerformEff(Control_Monad_Eff_Random.random) * 20.0) - 10.0;
  };
  var jiggle = function (i) {
      var $0 = i !== 0.0;
      if ($0) {
          return i;
      };
      if (!$0) {
          return (Control_Monad_Eff_Unsafe.unsafePerformEff(Control_Monad_Eff_Random.random) - 0.5) * 1.0e-6;
      };
      throw new Error("Failed pattern match at Util line 11, column 12 - line 13, column 1: " + [ $0.constructor.name ]);
  };
  var format = Global_Unsafe.unsafeToFixed(13);
  exports["format"] = format;
  exports["jiggle"] = jiggle;
  exports["jiggleD"] = jiggleD;
})(PS["Util"] = PS["Util"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Global = PS["Global"];
  var Data_Int = PS["Data.Int"];
  var Signal_DOM = PS["Signal.DOM"];
  var Util = PS["Util"];
  var Data_Eq = PS["Data.Eq"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Semiring = PS["Data.Semiring"];
  var Data_EuclideanRing = PS["Data.EuclideanRing"];
  var zeroV2 = {
      x: 0.0, 
      y: 0.0
  };
  var wrapCP = function (cp) {
      return {
          x: Data_Int.toNumber(cp.x), 
          y: Data_Int.toNumber(cp.y)
      };
  };
  var subV2 = function (v) {
      return function (v1) {
          return {
              x: v.x - v1.x, 
              y: v.y - v1.y
          };
      };
  };
  var smulV2 = function (v) {
      return function (n) {
          return {
              x: v.x * n, 
              y: v.y * n
          };
      };
  };
  var sdivV2 = function (v) {
      return function (n) {
          return {
              x: v.x / n, 
              y: v.y / n
          };
      };
  };
  var runVec2 = function (v) {
      return v;
  };
  var normL2Sq = function (v) {
      return v.x * v.x + v.y * v.y;
  };
  var jiggleV2 = function (v) {
      return {
          x: Util.jiggle(v.x), 
          y: Util.jiggle(v.y)
      };
  };
  var infV2 = {
      x: Global.infinity, 
      y: Global.infinity
  };
  var eqVec2 = new Data_Eq.Eq(function (v) {
      return function (v1) {
          return v.x === v1.x && v.y === v1.y;
      };
  });
  var addV2 = function (v) {
      return function (v1) {
          return {
              x: v.x + v1.x, 
              y: v.y + v1.y
          };
      };
  };
  exports["addV2"] = addV2;
  exports["infV2"] = infV2;
  exports["jiggleV2"] = jiggleV2;
  exports["normL2Sq"] = normL2Sq;
  exports["runVec2"] = runVec2;
  exports["sdivV2"] = sdivV2;
  exports["smulV2"] = smulV2;
  exports["subV2"] = subV2;
  exports["wrapCP"] = wrapCP;
  exports["zeroV2"] = zeroV2;
  exports["eqVec2"] = eqVec2;
})(PS["Vec2"] = PS["Vec2"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Vec2 = PS["Vec2"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Function = PS["Data.Function"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Ring = PS["Data.Ring"];        
  var Leaf = (function () {
      function Leaf(value0) {
          this.value0 = value0;
      };
      Leaf.create = function (value0) {
          return new Leaf(value0);
      };
      return Leaf;
  })();
  var Node = (function () {
      function Node(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      Node.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new Node(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return Node;
  })();
  var qPart = function (v) {
      return function (v1) {
          if (v instanceof Data_List.Nil) {
              return {
                  ul: Data_List.Nil.value, 
                  ur: Data_List.Nil.value, 
                  dl: Data_List.Nil.value, 
                  dr: Data_List.Nil.value
              };
          };
          if (v instanceof Data_List.Cons) {
              if (v.value0.coords.x < v1.x && v.value0.coords.y < v1.y) {
                  var $14 = qPart(v.value1)(v1);
                  var $15 = {};
                  for (var $16 in $14) {
                      if ($14.hasOwnProperty($16)) {
                          $15[$16] = $14[$16];
                      };
                  };
                  $15.ul = new Data_List.Cons(v.value0, $14.ul);
                  return $15;
              };
              if (v.value0.coords.x >= v1.x && v.value0.coords.y < v1.y) {
                  var $18 = qPart(v.value1)(v1);
                  var $19 = {};
                  for (var $20 in $18) {
                      if ($18.hasOwnProperty($20)) {
                          $19[$20] = $18[$20];
                      };
                  };
                  $19.ur = new Data_List.Cons(v.value0, $18.ur);
                  return $19;
              };
              if (v.value0.coords.x < v1.x && v.value0.coords.y >= v1.y) {
                  var $22 = qPart(v.value1)(v1);
                  var $23 = {};
                  for (var $24 in $22) {
                      if ($22.hasOwnProperty($24)) {
                          $23[$24] = $22[$24];
                      };
                  };
                  $23.dl = new Data_List.Cons(v.value0, $22.dl);
                  return $23;
              };
              if (Data_Boolean.otherwise) {
                  var $26 = qPart(v.value1)(v1);
                  var $27 = {};
                  for (var $28 in $26) {
                      if ($26.hasOwnProperty($28)) {
                          $27[$28] = $26[$28];
                      };
                  };
                  $27.dr = new Data_List.Cons(v.value0, $26.dr);
                  return $27;
              };
          };
          throw new Error("Failed pattern match at BarnesHut line 40, column 1 - line 40, column 53: " + [ v.constructor.name, v1.constructor.name ]);
      };
  };
  var foldBreak = function (fl) {
      return function (fn) {
          return function (qt) {
              var go = function (v) {
                  return function (r) {
                      if (v instanceof Leaf) {
                          return fl(v.value0)(r);
                      };
                      if (v instanceof Node) {
                          var fres = fn(v.value1)(v.value0)(r);
                          if (fres.stop) {
                              return fres.value;
                          };
                          if (!fres.stop) {
                              return Data_Function.apply(function ($70) {
                                  return (function ($71) {
                                      return go(v.value5)(go(v.value4)($71));
                                  })(go(v.value3)(go(v.value2)($70)));
                              })(fres.value);
                          };
                          throw new Error("Failed pattern match at BarnesHut line 28, column 5 - line 29, column 58: " + [ fres.stop.constructor.name ]);
                      };
                      throw new Error("Failed pattern match at BarnesHut line 24, column 1 - line 31, column 22: " + [ v.constructor.name, r.constructor.name ]);
                  };
              };
              return go(qt);
          };
      };
  };
  var ex = function (v) {
      if (v instanceof Leaf) {
          return v.value0;
      };
      if (v instanceof Node) {
          return v.value0;
      };
      throw new Error("Failed pattern match at BarnesHut line 16, column 1 - line 16, column 16: " + [ v.constructor.name ]);
  };
  var cover = function (v) {
      if (v instanceof Data_List.Nil) {
          return {
              v0: Vec2.zeroV2, 
              v1: Vec2.zeroV2
          };
      };
      return Data_Foldable.foldl(Data_List.foldableList)(function (v1) {
          return function (v2) {
              return {
                  v0: {
                      x: Data_Ord.min(Data_Ord.ordNumber)(v2.coords.x)(v1.v0.x), 
                      y: Data_Ord.min(Data_Ord.ordNumber)(v2.coords.y)(v1.v0.y)
                  }, 
                  v1: {
                      x: Data_Ord.max(Data_Ord.ordNumber)(v2.coords.x)(v1.v1.x), 
                      y: Data_Ord.max(Data_Ord.ordNumber)(v2.coords.y)(v1.v1.y)
                  }
              };
          };
      })({
          v0: Vec2.infV2, 
          v1: Vec2.zeroV2
      })(v);
  };
  var coincident = function (__copy_v) {
      var v = __copy_v;
      tco: while (true) {
          if (v instanceof Data_List.Nil) {
              return true;
          };
          if (v instanceof Data_List.Cons && v.value1 instanceof Data_List.Nil) {
              return true;
          };
          if (v instanceof Data_List.Cons && v.value1 instanceof Data_List.Cons) {
              if (Data_Eq.eq(Vec2.eqVec2)(v.value0.coords)(v.value1.value0.coords)) {
                  var __tco_v = v.value1;
                  v = __tco_v;
                  continue tco;
              };
              if (Data_Boolean.otherwise) {
                  return false;
              };
          };
          throw new Error("Failed pattern match at BarnesHut line 56, column 1 - line 56, column 22: " + [ v.constructor.name ]);
      };
  };
  var populateWith = function (fl) {
      return function (v) {
          return function (v1) {
              if (v1 instanceof Data_List.Nil) {
                  return Data_Function.apply(Leaf.create)(fl(Data_List.Nil.value));
              };
              var go = function (l1) {
                  return function (v2) {
                      return function (v3) {
                          if (coincident(l1)) {
                              return Data_Function.apply(Leaf.create)(fl(l1));
                          };
                          if (Data_Boolean.otherwise) {
                              var vm = Vec2.sdivV2(Vec2.addV2(v2)(v3))(2.0);
                              var rvm = Vec2.runVec2(vm);
                              var vdl0 = {
                                  x: v2.x, 
                                  y: rvm.y
                              };
                              var vdl1 = {
                                  x: rvm.x, 
                                  y: v3.y
                              };
                              var vur0 = {
                                  x: rvm.x, 
                                  y: v2.y
                              };
                              var vur1 = {
                                  x: v3.x, 
                                  y: rvm.y
                              };
                              var parts = qPart(l1)(vm);
                              var fur = go(parts.ur)(vur0)(vur1);
                              var ful = go(parts.ul)(v2)(vm);
                              var fdr = go(parts.dr)(vm)(v3);
                              var fdl = go(parts.dl)(vdl0)(vdl1);
                              return new Node(v(ex(ful))(ex(fur))(ex(fdl))(ex(fdr)), v3.x - v2.x, ful, fur, fdl, fdr);
                          };
                          throw new Error("Failed pattern match at BarnesHut line 65, column 1 - line 65, column 38: " + [ l1.constructor.name, v2.constructor.name, v3.constructor.name ]);
                      };
                  };
              };
              var cov = cover(v1);
              return go(v1)(cov.v0)(cov.v1);
          };
      };
  };
  exports["Leaf"] = Leaf;
  exports["Node"] = Node;
  exports["coincident"] = coincident;
  exports["cover"] = cover;
  exports["ex"] = ex;
  exports["foldBreak"] = foldBreak;
  exports["populateWith"] = populateWith;
  exports["qPart"] = qPart;
})(PS["BarnesHut"] = PS["BarnesHut"] || {});
(function(exports) {
  /* global window */
  "use strict";

  exports.window = function () {
    return window;
  };
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["DOM.HTML"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["window"] = $foreign.window;
})(PS["DOM.HTML"] = PS["DOM.HTML"] || {});
(function(exports) {
    "use strict";

  exports.body = function (doc) {
    return function () {
      return doc.body;
    };
  };
})(PS["DOM.HTML.Document"] = PS["DOM.HTML.Document"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  exports["null"] = null;

  exports.nullable = function(a, r, f) {
      return a == null ? r : f(a);
  };

  exports.notNull = function(x) {
      return x;
  };
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Nullable"];
  var Prelude = PS["Prelude"];
  var Data_Function = PS["Data.Function"];
  var Data_Function_Uncurried = PS["Data.Function.Uncurried"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Show = PS["Data.Show"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Ord = PS["Data.Ord"];        
  var toNullable = Data_Maybe.maybe($foreign["null"])($foreign.notNull);
  var toMaybe = function (n) {
      return $foreign.nullable(n, Data_Maybe.Nothing.value, Data_Maybe.Just.create);
  };
  exports["toMaybe"] = toMaybe;
  exports["toNullable"] = toNullable;
})(PS["Data.Nullable"] = PS["Data.Nullable"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["DOM.HTML.Document"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["body"] = $foreign.body;
})(PS["DOM.HTML.Document"] = PS["DOM.HTML.Document"] || {});
(function(exports) {
    "use strict";

  exports.document = function (window) {
    return function () {
      return window.document;
    };
  };
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["DOM.HTML.Window"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var DOM = PS["DOM"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  exports["document"] = $foreign.document;
})(PS["DOM.HTML.Window"] = PS["DOM.HTML.Window"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Array

  //------------------------------------------------------------------------------
  // Array creation --------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.range = function (start) {
    return function (end) {
      var step = start > end ? -1 : 1;
      var result = [];
      for (var i = start, n = 0; i !== end; i += step) {
        result[n++] = i;
      }
      result[n] = i;
      return result;
    };
  };   

  //------------------------------------------------------------------------------
  // Array size ------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.length = function (xs) {
    return xs.length;
  };

  //------------------------------------------------------------------------------
  // Non-indexed reads -----------------------------------------------------------
  //------------------------------------------------------------------------------

  exports["uncons'"] = function (empty) {
    return function (next) {
      return function (xs) {
        return xs.length === 0 ? empty({}) : next(xs[0])(xs.slice(1));
      };
    };
  };

  //------------------------------------------------------------------------------
  // Indexed operations ----------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.indexImpl = function (just) {
    return function (nothing) {
      return function (xs) {
        return function (i) {
          return i < 0 || i >= xs.length ? nothing :  just(xs[i]);
        };
      };
    };
  };

  exports._updateAt = function (just) {
    return function (nothing) {
      return function (i) {
        return function (a) {
          return function (l) {
            if (i < 0 || i >= l.length) return nothing;
            var l1 = l.slice();
            l1[i] = a;
            return just(l1);
          };
        };
      };
    };
  };

  //------------------------------------------------------------------------------
  // Subarrays -------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.slice = function (s) {
    return function (e) {
      return function (l) {
        return l.slice(s, e);
      };
    };
  };

  //------------------------------------------------------------------------------
  // Zipping ---------------------------------------------------------------------
  //------------------------------------------------------------------------------

  exports.zipWith = function (f) {
    return function (xs) {
      return function (ys) {
        var l = xs.length < ys.length ? xs.length : ys.length;
        var result = new Array(l);
        for (var i = 0; i < l; i++) {
          result[i] = f(xs[i])(ys[i]);
        }
        return result;
      };
    };
  };
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Array"];
  var Prelude = PS["Prelude"];
  var Control_Alt = PS["Control.Alt"];
  var Control_Alternative = PS["Control.Alternative"];
  var Control_Lazy = PS["Control.Lazy"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Data_Unfoldable = PS["Data.Unfoldable"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Function = PS["Data.Function"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Eq = PS["Data.Eq"];
  var Data_HeytingAlgebra = PS["Data.HeytingAlgebra"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Boolean = PS["Data.Boolean"];
  var Data_Semiring = PS["Data.Semiring"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Category = PS["Control.Category"];      
  var updateAt = $foreign._updateAt(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
  var toUnfoldable = function (dictUnfoldable) {
      return Data_Function.apply(Data_Unfoldable.unfoldr(dictUnfoldable))($foreign["uncons'"](Data_Function["const"](Data_Maybe.Nothing.value))(function (h) {
          return function (t) {
              return new Data_Maybe.Just(new Data_Tuple.Tuple(h, t));
          };
      }));
  };
  var mapWithIndex = function (f) {
      return function (xs) {
          return $foreign.zipWith(f)($foreign.range(0)($foreign.length(xs) - 1))(xs);
      };
  };
  var index = $foreign.indexImpl(Data_Maybe.Just.create)(Data_Maybe.Nothing.value);
  var modifyAt = function (i) {
      return function (f) {
          return function (xs) {
              var go = function (x) {
                  return updateAt(i)(f(x))(xs);
              };
              return Data_Maybe.maybe(Data_Maybe.Nothing.value)(go)(index(xs)(i));
          };
      };
  };
  exports["index"] = index;
  exports["mapWithIndex"] = mapWithIndex;
  exports["modifyAt"] = modifyAt;
  exports["toUnfoldable"] = toUnfoldable;
  exports["updateAt"] = updateAt;
  exports["length"] = $foreign.length;
})(PS["Data.Array"] = PS["Data.Array"] || {});
(function(exports) {
  /* global exports */
  "use strict";

  // module Data.Array.Partial

  exports.unsafeIndexImpl = function (xs) {
    return function (n) {
      return xs[n];
    };
  };
})(PS["Data.Array.Partial"] = PS["Data.Array.Partial"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Array.Partial"];
  var Prelude = PS["Prelude"];
  var Data_Array = PS["Data.Array"];
  var Data_Ring = PS["Data.Ring"];        
  var unsafeIndex = function (dictPartial) {
      return $foreign.unsafeIndexImpl;
  };
  exports["unsafeIndex"] = unsafeIndex;
})(PS["Data.Array.Partial"] = PS["Data.Array.Partial"] || {});
(function(exports) {
    "use strict";

  // module Unsafe.Coerce

  exports.unsafeCoerce = function (x) {
    return x;
  };
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Unsafe.Coerce"];
  exports["unsafeCoerce"] = $foreign.unsafeCoerce;
})(PS["Unsafe.Coerce"] = PS["Unsafe.Coerce"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Unsafe_Coerce = PS["Unsafe.Coerce"];        
  var runExists = Unsafe_Coerce.unsafeCoerce;
  var mkExists = Unsafe_Coerce.unsafeCoerce;
  exports["mkExists"] = mkExists;
  exports["runExists"] = runExists;
})(PS["Data.Exists"] = PS["Data.Exists"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Exists = PS["Data.Exists"];
  var Control_Comonad = PS["Control.Comonad"];
  var Control_Extend = PS["Control.Extend"];
  var Control_Monad_Trans = PS["Control.Monad.Trans"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Apply = PS["Control.Apply"];
  var Data_Function = PS["Data.Function"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Bind = PS["Control.Bind"];
  var Control_Monad = PS["Control.Monad"];
  var Control_Category = PS["Control.Category"];
  var Coyoneda = function (x) {
      return x;
  };
  var lowerCoyoneda = function (dictFunctor) {
      return function (v) {
          return Data_Exists.runExists(function (v1) {
              return Data_Functor.map(dictFunctor)(v1.k)(v1.fi);
          })(v);
      };
  };
  var liftCoyoneda = function (fa) {
      return Data_Function.apply(Coyoneda)(Data_Function.apply(Data_Exists.mkExists)({
          k: Control_Category.id(Control_Category.categoryFn), 
          fi: fa
      }));
  }; 
  var coyoneda = function (k) {
      return function (fi) {
          return Data_Function.apply(Coyoneda)(Data_Function.apply(Data_Exists.mkExists)({
              k: k, 
              fi: fi
          }));
      };
  };
  var functorCoyoneda = new Data_Functor.Functor(function (f) {
      return function (v) {
          return Data_Exists.runExists(function (v1) {
              return coyoneda(function ($36) {
                  return f(v1.k($36));
              })(v1.fi);
          })(v);
      };
  });
  exports["Coyoneda"] = Coyoneda;
  exports["coyoneda"] = coyoneda;
  exports["liftCoyoneda"] = liftCoyoneda;
  exports["lowerCoyoneda"] = lowerCoyoneda;
  exports["functorCoyoneda"] = functorCoyoneda;
})(PS["Data.Coyoneda"] = PS["Data.Coyoneda"] || {});
(function(exports) {exports.mkEffFn1 = function mkEffFn1(fn) {
    return function(x) {
      return fn(x)();
    };
  };

  exports.runEffFn1 = function runEffFn1(fn) {
    return function(a) {
      return function() {
        return fn(a);
      };
    };
  };

  exports.runEffFn2 = function runEffFn2(fn) {
    return function(a) {
      return function(b) {
        return function() {
          return fn(a, b);
        };
      };
    };
  };
})(PS["Data.Function.Eff"] = PS["Data.Function.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Data.Function.Eff"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  exports["mkEffFn1"] = $foreign.mkEffFn1;
  exports["runEffFn1"] = $foreign.runEffFn1;
  exports["runEffFn2"] = $foreign.runEffFn2;
})(PS["Data.Function.Eff"] = PS["Data.Function.Eff"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_List = PS["Data.List"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Traversable = PS["Data.Traversable"];
  var Data_Tuple = PS["Data.Tuple"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Show = PS["Data.Show"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Applicative = PS["Control.Applicative"];
  var Control_Category = PS["Control.Category"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Ordering = PS["Data.Ordering"];
  var Data_Function = PS["Data.Function"];
  var Data_Semiring = PS["Data.Semiring"];        
  var Leaf = (function () {
      function Leaf() {

      };
      Leaf.value = new Leaf();
      return Leaf;
  })();
  var Two = (function () {
      function Two(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Two.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Two(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Two;
  })();
  var Three = (function () {
      function Three(value0, value1, value2, value3, value4, value5, value6) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
          this.value6 = value6;
      };
      Three.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return function (value6) {
                                  return new Three(value0, value1, value2, value3, value4, value5, value6);
                              };
                          };
                      };
                  };
              };
          };
      };
      return Three;
  })();
  var TwoLeft = (function () {
      function TwoLeft(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoLeft(value0, value1, value2);
              };
          };
      };
      return TwoLeft;
  })();
  var TwoRight = (function () {
      function TwoRight(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      TwoRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new TwoRight(value0, value1, value2);
              };
          };
      };
      return TwoRight;
  })();
  var ThreeLeft = (function () {
      function ThreeLeft(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeLeft.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeLeft(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeLeft;
  })();
  var ThreeMiddle = (function () {
      function ThreeMiddle(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeMiddle.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeMiddle(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeMiddle;
  })();
  var ThreeRight = (function () {
      function ThreeRight(value0, value1, value2, value3, value4, value5) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
          this.value4 = value4;
          this.value5 = value5;
      };
      ThreeRight.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return function (value4) {
                          return function (value5) {
                              return new ThreeRight(value0, value1, value2, value3, value4, value5);
                          };
                      };
                  };
              };
          };
      };
      return ThreeRight;
  })();
  var KickUp = (function () {
      function KickUp(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      KickUp.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new KickUp(value0, value1, value2, value3);
                  };
              };
          };
      };
      return KickUp;
  })();
  var lookup = function (dictOrd) {
      return Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (k) {
              return function (tree) {
                  if (tree instanceof Leaf) {
                      return Data_Maybe.Nothing.value;
                  };
                  var comp = Data_Ord.compare(dictOrd);
                  var __unused = function (dictPartial1) {
                      return function ($dollar37) {
                          return $dollar37;
                      };
                  };
                  return __unused(dictPartial)((function () {
                      if (tree instanceof Two) {
                          var $162 = comp(k)(tree.value1);
                          if ($162 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value2);
                          };
                          if ($162 instanceof Data_Ordering.LT) {
                              return lookup(dictOrd)(k)(tree.value0);
                          };
                          return lookup(dictOrd)(k)(tree.value3);
                      };
                      if (tree instanceof Three) {
                          var $167 = comp(k)(tree.value1);
                          if ($167 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value2);
                          };
                          var $169 = comp(k)(tree.value4);
                          if ($169 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(tree.value5);
                          };
                          if ($167 instanceof Data_Ordering.LT) {
                              return lookup(dictOrd)(k)(tree.value0);
                          };
                          if ($169 instanceof Data_Ordering.GT) {
                              return lookup(dictOrd)(k)(tree.value6);
                          };
                          return lookup(dictOrd)(k)(tree.value3);
                      };
                      throw new Error("Failed pattern match at Data.Map line 133, column 10 - line 147, column 39: " + [ tree.constructor.name ]);
                  })());
              };
          };
      });
  }; 
  var fromZipper = function (__copy_dictOrd) {
      return function (__copy_v) {
          return function (__copy_tree) {
              var dictOrd = __copy_dictOrd;
              var v = __copy_v;
              var tree = __copy_tree;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return tree;
                  };
                  if (v instanceof Data_List.Cons) {
                      if (v.value0 instanceof TwoLeft) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Two(tree, v.value0.value0, v.value0.value1, v.value0.value2);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof TwoRight) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Two(v.value0.value0, v.value0.value1, v.value0.value2, tree);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeLeft) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(tree, v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeMiddle) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(v.value0.value0, v.value0.value1, v.value0.value2, tree, v.value0.value3, v.value0.value4, v.value0.value5);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeRight) {
                          var __tco_dictOrd = dictOrd;
                          var __tco_v = v.value1;
                          var __tco_tree = new Three(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5, tree);
                          dictOrd = __tco_dictOrd;
                          v = __tco_v;
                          tree = __tco_tree;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.Map line 224, column 3 - line 229, column 88: " + [ v.value0.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Data.Map line 222, column 1 - line 222, column 27: " + [ v.constructor.name, tree.constructor.name ]);
              };
          };
      };
  };
  var insert = function (dictOrd) {
      var up = function (__copy_v) {
          return function (__copy_v1) {
              var v = __copy_v;
              var v1 = __copy_v1;
              tco: while (true) {
                  if (v instanceof Data_List.Nil) {
                      return new Two(v1.value0, v1.value1, v1.value2, v1.value3);
                  };
                  if (v instanceof Data_List.Cons) {
                      if (v.value0 instanceof TwoLeft) {
                          return fromZipper(dictOrd)(v.value1)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, v.value0.value0, v.value0.value1, v.value0.value2));
                      };
                      if (v.value0 instanceof TwoRight) {
                          return fromZipper(dictOrd)(v.value1)(new Three(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0, v1.value1, v1.value2, v1.value3));
                      };
                      if (v.value0 instanceof ThreeLeft) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v1.value0, v1.value1, v1.value2, v1.value3), v.value0.value0, v.value0.value1, new Two(v.value0.value2, v.value0.value3, v.value0.value4, v.value0.value5));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeMiddle) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v1.value0), v1.value1, v1.value2, new Two(v1.value3, v.value0.value3, v.value0.value4, v.value0.value5));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      if (v.value0 instanceof ThreeRight) {
                          var __tco_v = v.value1;
                          var __tco_v1 = new KickUp(new Two(v.value0.value0, v.value0.value1, v.value0.value2, v.value0.value3), v.value0.value4, v.value0.value5, new Two(v1.value0, v1.value1, v1.value2, v1.value3));
                          v = __tco_v;
                          v1 = __tco_v1;
                          continue tco;
                      };
                      throw new Error("Failed pattern match at Data.Map line 260, column 5 - line 265, column 104: " + [ v.value0.constructor.name, v1.constructor.name ]);
                  };
                  throw new Error("Failed pattern match at Data.Map line 258, column 3 - line 258, column 54: " + [ v.constructor.name, v1.constructor.name ]);
              };
          };
      };
      var comp = Data_Ord.compare(dictOrd);
      var down = function (__copy_ctx) {
          return function (__copy_k) {
              return function (__copy_v) {
                  return function (__copy_v1) {
                      var ctx = __copy_ctx;
                      var k = __copy_k;
                      var v = __copy_v;
                      var v1 = __copy_v1;
                      tco: while (true) {
                          if (v1 instanceof Leaf) {
                              return up(ctx)(new KickUp(Leaf.value, k, v, Leaf.value));
                          };
                          if (v1 instanceof Two) {
                              var $290 = comp(k)(v1.value1);
                              if ($290 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Two(v1.value0, k, v, v1.value3));
                              };
                              if ($290 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new TwoLeft(v1.value1, v1.value2, v1.value3), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value0;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              var __tco_ctx = new Data_List.Cons(new TwoRight(v1.value0, v1.value1, v1.value2), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value3;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          if (v1 instanceof Three) {
                              var $295 = comp(k)(v1.value1);
                              if ($295 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Three(v1.value0, k, v, v1.value3, v1.value4, v1.value5, v1.value6));
                              };
                              var $297 = comp(k)(v1.value4);
                              if ($297 instanceof Data_Ordering.EQ) {
                                  return fromZipper(dictOrd)(ctx)(new Three(v1.value0, v1.value1, v1.value2, v1.value3, k, v, v1.value6));
                              };
                              if ($295 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new ThreeLeft(v1.value1, v1.value2, v1.value3, v1.value4, v1.value5, v1.value6), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value0;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              if ($295 instanceof Data_Ordering.GT && $297 instanceof Data_Ordering.LT) {
                                  var __tco_ctx = new Data_List.Cons(new ThreeMiddle(v1.value0, v1.value1, v1.value2, v1.value4, v1.value5, v1.value6), ctx);
                                  var __tco_k = k;
                                  var __tco_v = v;
                                  var __tco_v1 = v1.value3;
                                  ctx = __tco_ctx;
                                  k = __tco_k;
                                  v = __tco_v;
                                  v1 = __tco_v1;
                                  continue tco;
                              };
                              var __tco_ctx = new Data_List.Cons(new ThreeRight(v1.value0, v1.value1, v1.value2, v1.value3, v1.value4, v1.value5), ctx);
                              var __tco_k = k;
                              var __tco_v = v;
                              var __tco_v1 = v1.value6;
                              ctx = __tco_ctx;
                              k = __tco_k;
                              v = __tco_v;
                              v1 = __tco_v1;
                              continue tco;
                          };
                          throw new Error("Failed pattern match at Data.Map line 241, column 3 - line 241, column 52: " + [ ctx.constructor.name, k.constructor.name, v.constructor.name, v1.constructor.name ]);
                      };
                  };
              };
          };
      };
      return down(Data_List.Nil.value);
  };
  var pop = function (dictOrd) {
      var up = Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (ctxs) {
              return function (tree) {
                  if (ctxs instanceof Data_List.Nil) {
                      return tree;
                  };
                  if (ctxs instanceof Data_List.Cons) {
                      var __unused = function (dictPartial1) {
                          return function ($dollar45) {
                              return $dollar45;
                          };
                      };
                      return __unused(dictPartial)((function () {
                          if (ctxs.value0 instanceof TwoLeft && (ctxs.value0.value2 instanceof Leaf && tree instanceof Leaf)) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(Leaf.value, ctxs.value0.value0, ctxs.value0.value1, Leaf.value));
                          };
                          if (ctxs.value0 instanceof TwoRight && (ctxs.value0.value0 instanceof Leaf && tree instanceof Leaf)) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(Leaf.value, ctxs.value0.value1, ctxs.value0.value2, Leaf.value));
                          };
                          if (ctxs.value0 instanceof TwoLeft && ctxs.value0.value2 instanceof Two) {
                              return up(ctxs.value1)(new Three(tree, ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2.value0, ctxs.value0.value2.value1, ctxs.value0.value2.value2, ctxs.value0.value2.value3));
                          };
                          if (ctxs.value0 instanceof TwoRight && ctxs.value0.value0 instanceof Two) {
                              return up(ctxs.value1)(new Three(ctxs.value0.value0.value0, ctxs.value0.value0.value1, ctxs.value0.value0.value2, ctxs.value0.value0.value3, ctxs.value0.value1, ctxs.value0.value2, tree));
                          };
                          if (ctxs.value0 instanceof TwoLeft && ctxs.value0.value2 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(new Two(tree, ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2.value0), ctxs.value0.value2.value1, ctxs.value0.value2.value2, new Two(ctxs.value0.value2.value3, ctxs.value0.value2.value4, ctxs.value0.value2.value5, ctxs.value0.value2.value6)));
                          };
                          if (ctxs.value0 instanceof TwoRight && ctxs.value0.value0 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(new Two(ctxs.value0.value0.value0, ctxs.value0.value0.value1, ctxs.value0.value0.value2, ctxs.value0.value0.value3), ctxs.value0.value0.value4, ctxs.value0.value0.value5, new Two(ctxs.value0.value0.value6, ctxs.value0.value1, ctxs.value0.value2, tree)));
                          };
                          if (ctxs.value0 instanceof ThreeLeft && (ctxs.value0.value2 instanceof Leaf && (ctxs.value0.value5 instanceof Leaf && tree instanceof Leaf))) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(Leaf.value, ctxs.value0.value0, ctxs.value0.value1, Leaf.value, ctxs.value0.value3, ctxs.value0.value4, Leaf.value));
                          };
                          if (ctxs.value0 instanceof ThreeMiddle && (ctxs.value0.value0 instanceof Leaf && (ctxs.value0.value5 instanceof Leaf && tree instanceof Leaf))) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(Leaf.value, ctxs.value0.value1, ctxs.value0.value2, Leaf.value, ctxs.value0.value3, ctxs.value0.value4, Leaf.value));
                          };
                          if (ctxs.value0 instanceof ThreeRight && (ctxs.value0.value0 instanceof Leaf && (ctxs.value0.value3 instanceof Leaf && tree instanceof Leaf))) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(Leaf.value, ctxs.value0.value1, ctxs.value0.value2, Leaf.value, ctxs.value0.value4, ctxs.value0.value5, Leaf.value));
                          };
                          if (ctxs.value0 instanceof ThreeLeft && ctxs.value0.value2 instanceof Two) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(new Three(tree, ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2.value0, ctxs.value0.value2.value1, ctxs.value0.value2.value2, ctxs.value0.value2.value3), ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5));
                          };
                          if (ctxs.value0 instanceof ThreeMiddle && ctxs.value0.value0 instanceof Two) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(new Three(ctxs.value0.value0.value0, ctxs.value0.value0.value1, ctxs.value0.value0.value2, ctxs.value0.value0.value3, ctxs.value0.value1, ctxs.value0.value2, tree), ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5));
                          };
                          if (ctxs.value0 instanceof ThreeMiddle && ctxs.value0.value5 instanceof Two) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2, new Three(tree, ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5.value0, ctxs.value0.value5.value1, ctxs.value0.value5.value2, ctxs.value0.value5.value3)));
                          };
                          if (ctxs.value0 instanceof ThreeRight && ctxs.value0.value3 instanceof Two) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Two(ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2, new Three(ctxs.value0.value3.value0, ctxs.value0.value3.value1, ctxs.value0.value3.value2, ctxs.value0.value3.value3, ctxs.value0.value4, ctxs.value0.value5, tree)));
                          };
                          if (ctxs.value0 instanceof ThreeLeft && ctxs.value0.value2 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(new Two(tree, ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2.value0), ctxs.value0.value2.value1, ctxs.value0.value2.value2, new Two(ctxs.value0.value2.value3, ctxs.value0.value2.value4, ctxs.value0.value2.value5, ctxs.value0.value2.value6), ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5));
                          };
                          if (ctxs.value0 instanceof ThreeMiddle && ctxs.value0.value0 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(new Two(ctxs.value0.value0.value0, ctxs.value0.value0.value1, ctxs.value0.value0.value2, ctxs.value0.value0.value3), ctxs.value0.value0.value4, ctxs.value0.value0.value5, new Two(ctxs.value0.value0.value6, ctxs.value0.value1, ctxs.value0.value2, tree), ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5));
                          };
                          if (ctxs.value0 instanceof ThreeMiddle && ctxs.value0.value5 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2, new Two(tree, ctxs.value0.value3, ctxs.value0.value4, ctxs.value0.value5.value0), ctxs.value0.value5.value1, ctxs.value0.value5.value2, new Two(ctxs.value0.value5.value3, ctxs.value0.value5.value4, ctxs.value0.value5.value5, ctxs.value0.value5.value6)));
                          };
                          if (ctxs.value0 instanceof ThreeRight && ctxs.value0.value3 instanceof Three) {
                              return fromZipper(dictOrd)(ctxs.value1)(new Three(ctxs.value0.value0, ctxs.value0.value1, ctxs.value0.value2, new Two(ctxs.value0.value3.value0, ctxs.value0.value3.value1, ctxs.value0.value3.value2, ctxs.value0.value3.value3), ctxs.value0.value3.value4, ctxs.value0.value3.value5, new Two(ctxs.value0.value3.value6, ctxs.value0.value4, ctxs.value0.value5, tree)));
                          };
                          throw new Error("Failed pattern match at Data.Map line 310, column 9 - line 327, column 136: " + [ ctxs.value0.constructor.name, tree.constructor.name ]);
                      })());
                  };
                  throw new Error("Failed pattern match at Data.Map line 307, column 5 - line 327, column 136: " + [ ctxs.constructor.name ]);
              };
          };
      });
      var removeMaxNode = Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (ctx) {
              return function (m) {
                  var __unused = function (dictPartial1) {
                      return function ($dollar47) {
                          return $dollar47;
                      };
                  };
                  return __unused(dictPartial)((function () {
                      if (m instanceof Two && (m.value0 instanceof Leaf && m.value3 instanceof Leaf)) {
                          return up(ctx)(Leaf.value);
                      };
                      if (m instanceof Two) {
                          return removeMaxNode(new Data_List.Cons(new TwoRight(m.value0, m.value1, m.value2), ctx))(m.value3);
                      };
                      if (m instanceof Three && (m.value0 instanceof Leaf && (m.value3 instanceof Leaf && m.value6 instanceof Leaf))) {
                          return up(new Data_List.Cons(new TwoRight(Leaf.value, m.value1, m.value2), ctx))(Leaf.value);
                      };
                      if (m instanceof Three) {
                          return removeMaxNode(new Data_List.Cons(new ThreeRight(m.value0, m.value1, m.value2, m.value3, m.value4, m.value5), ctx))(m.value6);
                      };
                      throw new Error("Failed pattern match at Data.Map line 339, column 5 - line 343, column 107: " + [ m.constructor.name ]);
                  })());
              };
          };
      });
      var maxNode = Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (m) {
              var __unused = function (dictPartial1) {
                  return function ($dollar49) {
                      return $dollar49;
                  };
              };
              return __unused(dictPartial)((function () {
                  if (m instanceof Two && m.value3 instanceof Leaf) {
                      return {
                          key: m.value1, 
                          value: m.value2
                      };
                  };
                  if (m instanceof Two) {
                      return maxNode(m.value3);
                  };
                  if (m instanceof Three && m.value6 instanceof Leaf) {
                      return {
                          key: m.value4, 
                          value: m.value5
                      };
                  };
                  if (m instanceof Three) {
                      return maxNode(m.value6);
                  };
                  throw new Error("Failed pattern match at Data.Map line 330, column 33 - line 334, column 45: " + [ m.constructor.name ]);
              })());
          };
      });
      var comp = Data_Ord.compare(dictOrd);
      var down = Partial_Unsafe.unsafePartial(function (dictPartial) {
          return function (ctx) {
              return function (k) {
                  return function (m) {
                      if (m instanceof Leaf) {
                          return Data_Maybe.Nothing.value;
                      };
                      if (m instanceof Two) {
                          var $508 = comp(k)(m.value1);
                          if (m.value3 instanceof Leaf && $508 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value2, up(ctx)(Leaf.value)));
                          };
                          if ($508 instanceof Data_Ordering.EQ) {
                              var max = maxNode(m.value0);
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value2, removeMaxNode(new Data_List.Cons(new TwoLeft(max.key, max.value, m.value3), ctx))(m.value0)));
                          };
                          if ($508 instanceof Data_Ordering.LT) {
                              return down(new Data_List.Cons(new TwoLeft(m.value1, m.value2, m.value3), ctx))(k)(m.value0);
                          };
                          return down(new Data_List.Cons(new TwoRight(m.value0, m.value1, m.value2), ctx))(k)(m.value3);
                      };
                      if (m instanceof Three) {
                          var leaves = (function () {
                              if (m.value0 instanceof Leaf && (m.value3 instanceof Leaf && m.value6 instanceof Leaf)) {
                                  return true;
                              };
                              return false;
                          })();
                          var $517 = comp(k)(m.value1);
                          var $518 = comp(k)(m.value4);
                          if (leaves && $517 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value2, fromZipper(dictOrd)(ctx)(new Two(Leaf.value, m.value4, m.value5, Leaf.value))));
                          };
                          if (leaves && $518 instanceof Data_Ordering.EQ) {
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value5, fromZipper(dictOrd)(ctx)(new Two(Leaf.value, m.value1, m.value2, Leaf.value))));
                          };
                          if ($517 instanceof Data_Ordering.EQ) {
                              var max = maxNode(m.value0);
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value2, removeMaxNode(new Data_List.Cons(new ThreeLeft(max.key, max.value, m.value3, m.value4, m.value5, m.value6), ctx))(m.value0)));
                          };
                          if ($518 instanceof Data_Ordering.EQ) {
                              var max = maxNode(m.value3);
                              return new Data_Maybe.Just(new Data_Tuple.Tuple(m.value5, removeMaxNode(new Data_List.Cons(new ThreeMiddle(m.value0, m.value1, m.value2, max.key, max.value, m.value6), ctx))(m.value3)));
                          };
                          if ($517 instanceof Data_Ordering.LT) {
                              return down(new Data_List.Cons(new ThreeLeft(m.value1, m.value2, m.value3, m.value4, m.value5, m.value6), ctx))(k)(m.value0);
                          };
                          if ($517 instanceof Data_Ordering.GT && $518 instanceof Data_Ordering.LT) {
                              return down(new Data_List.Cons(new ThreeMiddle(m.value0, m.value1, m.value2, m.value4, m.value5, m.value6), ctx))(k)(m.value3);
                          };
                          return down(new Data_List.Cons(new ThreeRight(m.value0, m.value1, m.value2, m.value3, m.value4, m.value5), ctx))(k)(m.value6);
                      };
                      throw new Error("Failed pattern match at Data.Map line 280, column 36 - line 303, column 82: " + [ m.constructor.name ]);
                  };
              };
          };
      });
      return down(Data_List.Nil.value);
  };
  var empty = Leaf.value;
  var $$delete = function (dictOrd) {
      return function (k) {
          return function (m) {
              return Data_Maybe.maybe(m)(Data_Tuple.snd)(pop(dictOrd)(k)(m));
          };
      };
  };
  var alter = function (dictOrd) {
      return function (f) {
          return function (k) {
              return function (m) {
                  var $595 = f(lookup(dictOrd)(k)(m));
                  if ($595 instanceof Data_Maybe.Nothing) {
                      return $$delete(dictOrd)(k)(m);
                  };
                  if ($595 instanceof Data_Maybe.Just) {
                      return insert(dictOrd)(k)($595.value0)(m);
                  };
                  throw new Error("Failed pattern match at Data.Map line 348, column 15 - line 350, column 25: " + [ $595.constructor.name ]);
              };
          };
      };
  };
  exports["alter"] = alter;
  exports["empty"] = empty;
  exports["insert"] = insert;
  exports["lookup"] = lookup;
  exports["pop"] = pop;
})(PS["Data.Map"] = PS["Data.Map"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Int = PS["Data.Int"];
  var Data_Array = PS["Data.Array"];
  var Data_Function = PS["Data.Function"];        
  var Link = (function () {
      function Link(value0, value1, value2) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
      };
      Link.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return new Link(value0, value1, value2);
              };
          };
      };
      return Link;
  })();
  var mkGraph = function (nodes) {
      return function (links) {
          return {
              numNodes: Data_Function.apply(Data_Int.toNumber)(Data_Array.length(nodes)), 
              nodes: nodes, 
              links: links
          };
      };
  };
  exports["Link"] = Link;
  exports["mkGraph"] = mkGraph;
})(PS["Graph"] = PS["Graph"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Global = PS["Global"];
  var $$Math = PS["Math"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Int = PS["Data.Int"];
  var Data_List = PS["Data.List"];
  var Data_Array = PS["Data.Array"];
  var Data_Array_Partial = PS["Data.Array.Partial"];
  var Data_Map = PS["Data.Map"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple_Nested = PS["Data.Tuple.Nested"];
  var Vec2 = PS["Vec2"];
  var Graph = PS["Graph"];
  var BarnesHut = PS["BarnesHut"];
  var Util = PS["Util"];
  var Data_Function = PS["Data.Function"];
  var Data_Semiring = PS["Data.Semiring"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Ord = PS["Data.Ord"];
  var Data_Ring = PS["Data.Ring"];
  var Data_Functor = PS["Data.Functor"];
  var Data_EuclideanRing = PS["Data.EuclideanRing"];
  var Data_Eq = PS["Data.Eq"];
  var Control_Category = PS["Control.Category"];        
  var Center = (function () {
      function Center(value0) {
          this.value0 = value0;
      };
      Center.create = function (value0) {
          return new Center(value0);
      };
      return Center;
  })();
  var Links = (function () {
      function Links() {

      };
      Links.value = new Links();
      return Links;
  })();
  var ManyBody = (function () {
      function ManyBody(value0) {
          this.value0 = value0;
      };
      ManyBody.create = function (value0) {
          return new ManyBody(value0);
      };
      return ManyBody;
  })();
  var mkDrawGraph = function (v) {
      return function (g) {
          var bump = function (v1) {
              if (v1 instanceof Data_Maybe.Nothing) {
                  return new Data_Maybe.Just(1);
              };
              if (v1 instanceof Data_Maybe.Just) {
                  return Data_Function.apply(Data_Maybe.Just.create)(v1.value0 + 1 | 0);
              };
              throw new Error("Failed pattern match at Force line 56, column 5 - line 56, column 51: " + [ v1.constructor.name ]);
          };
          var countMap = Data_Foldable.foldr(Data_Foldable.foldableArray)(function (v1) {
              return function ($76) {
                  return Data_Map.alter(Data_Ord.ordInt)(bump)(v1.value1)(Data_Map.alter(Data_Ord.ordInt)(bump)(v1.value0)($76));
              };
          })(Data_Map.empty)(g.links);
          var getCount = function (i) {
              return Data_Maybe.fromMaybe(0)(Data_Map.lookup(Data_Ord.ordInt)(i)(countMap));
          };
          return {
              numNodes: g.numNodes, 
              nodes: Data_Function.applyFlipped(g.nodes)(Data_Array.mapWithIndex(function (i) {
                  return function (n) {
                      return {
                          coords: {
                              x: Util.jiggleD(v.x), 
                              y: Util.jiggleD(v.y)
                          }, 
                          velocity: {
                              x: 0.0, 
                              y: 0.0
                          }, 
                          count: getCount(i), 
                          strength: -30.0, 
                          payload: n
                      };
                  };
              })), 
              links: Data_Functor.mapFlipped(Data_Functor.functorArray)(g.links)(function (v1) {
                  var tcnt = Data_Function.apply(Data_Int.toNumber)(getCount(v1.value1));
                  var fcnt = Data_Function.apply(Data_Int.toNumber)(getCount(v1.value0));
                  return new Graph.Link(v1.value0, v1.value1, {
                      bias: fcnt / (fcnt + tcnt), 
                      strength: 1.0 / Data_Ord.min(Data_Ord.ordNumber)(fcnt)(tcnt), 
                      distance: 30.0
                  });
              })
          };
      };
  };
  var mkRenderGraph = function (center) {
      return function (alphaMin) {
          return function (graph) {
              return {
                  graph: mkDrawGraph(center)(graph), 
                  forces: new Data_List.Cons(Links.value, new Data_List.Cons(new ManyBody({
                      distanceMin: 1.0, 
                      distanceMax: Global.infinity, 
                      theta2: 0.81
                  }), new Data_List.Cons(new Center(center), Data_List.Nil.value))), 
                  alpha: 1.0, 
                  alphaMin: alphaMin, 
                  alphaDecay: 1.0 - $$Math.pow(alphaMin)(1.0 / 300.0), 
                  alphaTarget: 0.0, 
                  velocityDecay: 0.6, 
                  status: "TEST"
              };
          };
      };
  };
  var force = function (v) {
      return function (v1) {
          return function (g) {
              if (v1 instanceof Center) {
                  var sumCoords = Data_Foldable.foldl(Data_Foldable.foldableArray)(function (v2) {
                      return function (n) {
                          return Vec2.addV2(v2)(n.coords);
                      };
                  })(Vec2.zeroV2)(g.nodes);
                  var s1 = Vec2.subV2(Vec2.sdivV2(sumCoords)(g.numNodes))(v1.value0);
                  var $29 = {};
                  for (var $30 in g) {
                      if (g.hasOwnProperty($30)) {
                          $29[$30] = g[$30];
                      };
                  };
                  $29.nodes = Data_Functor.mapFlipped(Data_Functor.functorArray)(g.nodes)(function (n) {
                      var $26 = {};
                      for (var $27 in n) {
                          if (n.hasOwnProperty($27)) {
                              $26[$27] = n[$27];
                          };
                      };
                      $26.coords = Vec2.subV2(n.coords)(s1);
                      return $26;
                  });
                  return $29;
              };
              if (v1 instanceof Links) {
                  var updateFromLink = function (m) {
                      return function (v2) {
                          var nt = Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                              return Data_Array_Partial.unsafeIndex(dictPartial)(m)(v2.value1);
                          });
                          var nf = Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                              return Data_Array_Partial.unsafeIndex(dictPartial)(m)(v2.value0);
                          });
                          var v11 = Data_Function.apply(Vec2.jiggleV2)(Vec2.subV2(Vec2.addV2(nt.coords)(nt.velocity))(Vec2.addV2(nf.coords)(nf.velocity)));
                          var l1 = Data_Function.apply($$Math.sqrt)(Vec2.normL2Sq(v11));
                          var l2 = ((l1 - v2.value2.distance) / l1) * v * v2.value2.strength;
                          var v21 = Vec2.smulV2(v11)(l2);
                          var vf2 = Vec2.addV2(nf.velocity)(Vec2.smulV2(v21)(1.0 - v2.value2.bias));
                          var vt2 = Vec2.subV2(nt.velocity)(Vec2.smulV2(v21)(v2.value2.bias));
                          var bumpVelo = function (v3) {
                              return function (r) {
                                  var $35 = {};
                                  for (var $36 in r) {
                                      if (r.hasOwnProperty($36)) {
                                          $35[$36] = r[$36];
                                      };
                                  };
                                  $35.velocity = v3;
                                  return $35;
                              };
                          };
                          return Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                              return (function ($77) {
                                  return Data_Maybe.fromJust(dictPartial)(Data_Function.apply(Data_Array.modifyAt(v2.value1))(bumpVelo(vt2))(Data_Maybe.fromJust(dictPartial)($77)));
                              })(Data_Function.apply(Data_Array.modifyAt(v2.value0))(bumpVelo(vf2))(m));
                          });
                      };
                  };
                  var $41 = {};
                  for (var $42 in g) {
                      if (g.hasOwnProperty($42)) {
                          $41[$42] = g[$42];
                      };
                  };
                  $41.nodes = Data_Foldable.foldl(Data_Foldable.foldableArray)(updateFromLink)(g.nodes)(g.links);
                  return $41;
              };
              if (v1 instanceof ManyBody) {
                  var simnode = function (w) {
                      return function (n) {
                          return function (a) {
                              var pos = Data_Function.apply(Vec2.jiggleV2)(Vec2.subV2(n.pos)(a.coords));
                              var l = Vec2.normL2Sq(pos);
                              var l2 = (function () {
                                  var $44 = l < v1.value0.distanceMin;
                                  if ($44) {
                                      return Data_Function.apply($$Math.sqrt)(v1.value0.distanceMin * l);
                                  };
                                  if (!$44) {
                                      return l;
                                  };
                                  throw new Error("Failed pattern match at Force line 124, column 14 - line 124, column 71: " + [ $44.constructor.name ]);
                              })();
                              var $45 = (w * w) / v1.value0.theta2 < l;
                              if ($45) {
                                  var $46 = l < v1.value0.distanceMax;
                                  if ($46) {
                                      return {
                                          stop: true, 
                                          value: (function () {
                                              var $47 = {};
                                              for (var $48 in a) {
                                                  if (a.hasOwnProperty($48)) {
                                                      $47[$48] = a[$48];
                                                  };
                                              };
                                              $47.velocity = Vec2.addV2(a.velocity)(Vec2.smulV2(pos)((n.strength * v) / l2));
                                              return $47;
                                          })()
                                      };
                                  };
                                  if (!$46) {
                                      return {
                                          stop: true, 
                                          value: a
                                      };
                                  };
                                  throw new Error("Failed pattern match at Force line 115, column 9 - line 119, column 40: " + [ $46.constructor.name ]);
                              };
                              if (!$45) {
                                  return {
                                      stop: false, 
                                      value: a
                                  };
                              };
                              throw new Error("Failed pattern match at Force line 114, column 7 - line 120, column 39: " + [ $45.constructor.name ]);
                          };
                      };
                  };
                  var simleaf = function (i) {
                      return function (n) {
                          return function (a) {
                              var pos = Data_Function.apply(Vec2.jiggleV2)(Vec2.subV2(n.pos)(a.coords));
                              var l = Vec2.normL2Sq(pos);
                              var l2 = (function () {
                                  var $50 = l < v1.value0.distanceMin;
                                  if ($50) {
                                      return Data_Function.apply($$Math.sqrt)(v1.value0.distanceMin * l);
                                  };
                                  if (!$50) {
                                      return l;
                                  };
                                  throw new Error("Failed pattern match at Force line 112, column 14 - line 112, column 71: " + [ $50.constructor.name ]);
                              })();
                              var $51 = l >= v1.value0.distanceMax;
                              if ($51) {
                                  return a;
                              };
                              if (!$51) {
                                  return Data_Foldable.foldl(Data_List.foldableList)(function (a1) {
                                      return function (n1) {
                                          var $52 = i === n1.payload;
                                          if ($52) {
                                              return a1;
                                          };
                                          if (!$52) {
                                              var $53 = {};
                                              for (var $54 in a1) {
                                                  if (a1.hasOwnProperty($54)) {
                                                      $53[$54] = a1[$54];
                                                  };
                                              };
                                              $53.velocity = Vec2.addV2(a1.velocity)(Vec2.smulV2(pos)((n1.strength * v) / l2));
                                              return $53;
                                          };
                                          throw new Error("Failed pattern match at Force line 106, column 27 - line 107, column 80: " + [ $52.constructor.name ]);
                                      };
                                  })(a)(n.payloads);
                              };
                              throw new Error("Failed pattern match at Force line 105, column 7 - line 108, column 23: " + [ $51.constructor.name ]);
                          };
                      };
                  };
                  var node = function (ul) {
                      return function (ur) {
                          return function (dl) {
                              return function (dr) {
                                  var sumpos = Vec2.addV2(Vec2.addV2(Vec2.addV2(Vec2.smulV2(ul.pos)(ul.strength))(Vec2.smulV2(ur.pos)(ur.strength)))(Vec2.smulV2(dl.pos)(dl.strength)))(Vec2.smulV2(dr.pos)(dr.strength));
                                  var s = ul.strength + ur.strength + dl.strength + dr.strength;
                                  return {
                                      pos: Vec2.sdivV2(sumpos)(s), 
                                      strength: s, 
                                      payloads: Data_List.Nil.value
                                  };
                              };
                          };
                      };
                  };
                  var leaf = function (v2) {
                      if (v2 instanceof Data_List.Nil) {
                          return {
                              pos: Vec2.zeroV2, 
                              strength: 0.0, 
                              payloads: Data_List.Nil.value
                          };
                      };
                      if (v2 instanceof Data_List.Cons) {
                          return {
                              pos: v2.value0.coords, 
                              strength: Data_Foldable.foldl(Data_List.foldableList)(function (s) {
                                  return function (n) {
                                      return s + n.strength;
                                  };
                              })(0.0)(v2), 
                              payloads: v2
                          };
                      };
                      throw new Error("Failed pattern match at Force line 64, column 1 - line 67, column 39: " + [ v2.constructor.name ]);
                  };
                  var qt = BarnesHut.populateWith(leaf)(node)(Data_Function.applyFlipped(Data_Array.toUnfoldable(Data_List.unfoldableList)(g.nodes))(Data_List.mapWithIndex(function (n) {
                      return function (i) {
                          var $59 = {};
                          for (var $60 in n) {
                              if (n.hasOwnProperty($60)) {
                                  $59[$60] = n[$60];
                              };
                          };
                          $59.payload = i;
                          return $59;
                      };
                  })));
                  var $62 = {};
                  for (var $63 in g) {
                      if (g.hasOwnProperty($63)) {
                          $62[$63] = g[$63];
                      };
                  };
                  $62.nodes = Data_Function.applyFlipped(g.nodes)(Data_Array.mapWithIndex(function (i) {
                      return BarnesHut.foldBreak(simleaf(i))(simnode)(qt);
                  }));
                  return $62;
              };
              throw new Error("Failed pattern match at Force line 64, column 1 - line 67, column 39: " + [ v.constructor.name, v1.constructor.name, g.constructor.name ]);
          };
      };
  };
  var evolveForces = function (rg) {
      var applyVelocities = function (g) {
          var $69 = {};
          for (var $70 in g) {
              if (g.hasOwnProperty($70)) {
                  $69[$70] = g[$70];
              };
          };
          $69.nodes = Data_Functor.mapFlipped(Data_Functor.functorArray)(g.nodes)(function (n) {
              var $66 = {};
              for (var $67 in n) {
                  if (n.hasOwnProperty($67)) {
                      $66[$67] = n[$67];
                  };
              };
              $66.coords = Vec2.addV2(n.coords)(n.velocity);
              $66.velocity = Vec2.smulV2(n.velocity)(rg.velocityDecay);
              return $66;
          });
          return $69;
      };
      var applyForces = Data_Foldable.foldl(Data_List.foldableList)(Control_Semigroupoid.composeFlipped(Control_Semigroupoid.semigroupoidFn))(Control_Category.id(Control_Category.categoryFn))(Data_Functor.mapFlipped(Data_List.functorList)(rg.forces)(force(rg.alpha)));
      var $72 = rg.alpha < rg.alphaMin;
      if ($72) {
          return rg;
      };
      if (!$72) {
          var $73 = {};
          for (var $74 in rg) {
              if (rg.hasOwnProperty($74)) {
                  $73[$74] = rg[$74];
              };
          };
          $73.graph = applyVelocities(applyForces(rg.graph));
          $73.alpha = rg.alpha + (rg.alphaTarget - rg.alpha) * rg.alphaDecay;
          return $73;
      };
      throw new Error("Failed pattern match at Force line 152, column 19 - line 155, column 12: " + [ $72.constructor.name ]);
  };
  exports["Center"] = Center;
  exports["Links"] = Links;
  exports["ManyBody"] = ManyBody;
  exports["evolveForces"] = evolveForces;
  exports["force"] = force;
  exports["mkDrawGraph"] = mkDrawGraph;
  exports["mkRenderGraph"] = mkRenderGraph;
})(PS["Force"] = PS["Force"] || {});
(function(exports) {// module Signal.Channel

  exports.channelP =
    function channelP(constant) {
      return function(v) {
        return function() {
          return constant(v);
        };
      };
    };

  exports.sendP =
    function sendP(chan, v) {
      return function(v) {
        return function() {
          chan.set(v);
        };
      };
    };

  exports.subscribe =
    function subscribe(chan) {
      return chan;
    };
})(PS["Signal.Channel"] = PS["Signal.Channel"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Signal.Channel"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Prelude = PS["Prelude"];
  var Signal = PS["Signal"];        
  var send = $foreign.sendP;
  var channel = $foreign.channelP(Signal.constant);
  exports["channel"] = channel;
  exports["send"] = send;
  exports["subscribe"] = $foreign.subscribe;
})(PS["Signal.Channel"] = PS["Signal.Channel"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Control_Plus = PS["Control.Plus"];
  var Data_Coyoneda = PS["Data.Coyoneda"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Functor = PS["Data.Functor"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Control_Alt = PS["Control.Alt"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var Attr = (function () {
      function Attr(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Attr.create = function (value0) {
          return function (value1) {
              return new Attr(value0, value1);
          };
      };
      return Attr;
  })();
  var Handler = (function () {
      function Handler(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Handler.create = function (value0) {
          return function (value1) {
              return new Handler(value0, value1);
          };
      };
      return Handler;
  })();
  var Key = (function () {
      function Key(value0) {
          this.value0 = value0;
      };
      Key.create = function (value0) {
          return new Key(value0);
      };
      return Key;
  })();
  var Tag = (function () {
      function Tag(value0, value1, value2, value3) {
          this.value0 = value0;
          this.value1 = value1;
          this.value2 = value2;
          this.value3 = value3;
      };
      Tag.create = function (value0) {
          return function (value1) {
              return function (value2) {
                  return function (value3) {
                      return new Tag(value0, value1, value2, value3);
                  };
              };
          };
      };
      return Tag;
  })();
  var Text = (function () {
      function Text(value0) {
          this.value0 = value0;
      };
      Text.create = function (value0) {
          return new Text(value0);
      };
      return Text;
  })();
  var text = function (str) {
      return [ new Text(str) ];
  };
  var tag = function (tn) {
      return function (ns) {
          return function (ps) {
              return function (cs) {
                  return [ new Tag(tn, ns, ps, Data_Coyoneda.liftCoyoneda(cs)) ];
              };
          };
      };
  };
  var propFunctor = new Data_Functor.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Attr) {
              return new Attr(v1.value0, v1.value1);
          };
          if (v1 instanceof Handler) {
              return new Handler(v1.value0, function ($37) {
                  return v(v1.value1($37));
              });
          };
          if (v1 instanceof Key) {
              return new Key(v1.value0);
          };
          throw new Error("Failed pattern match at Web.Markup line 62, column 3 - line 62, column 34: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var nodeFunctor = new Data_Functor.Functor(function (v) {
      return function (v1) {
          if (v1 instanceof Tag) {
              return new Tag(v1.value0, v1.value1, Data_Functor.map(Data_Functor.functorArray)(Data_Functor.map(propFunctor)(v))(v1.value2), Data_Functor.map(Data_Coyoneda.functorCoyoneda)(v)(v1.value3));
          };
          if (v1 instanceof Text) {
              return new Text(v1.value0);
          };
          throw new Error("Failed pattern match at Web.Markup line 52, column 3 - line 52, column 70: " + [ v.constructor.name, v1.constructor.name ]);
      };
  });
  var markupFunctor = new Data_Functor.Functor(function (f) {
      return function (v) {
          return Data_Functor.map(Data_Functor.functorArray)(Data_Functor.map(nodeFunctor)(f))(v);
      };
  });
  var markupAlt = new Control_Alt.Alt(function () {
      return markupFunctor;
  }, function (v) {
      return function (v1) {
          return Data_Semigroup.append(Data_Semigroup.semigroupArray)(v)(v1);
      };
  });
  var markupPlus = new Control_Plus.Plus(function () {
      return markupAlt;
  }, Control_Plus.empty(Control_Plus.plusArray));
  var markupSemigroup = new Data_Semigroup.Semigroup(Control_Alt.alt(markupAlt));
  var markupMonoid = new Data_Monoid.Monoid(function () {
      return markupSemigroup;
  }, Control_Plus.empty(markupPlus));
  var markup = function (dictMonoid) {
      return function (tagf) {
          return function (textf) {
              return function (v) {
                  var node = function (v1) {
                      if (v1 instanceof Tag) {
                          return tagf(v1.value0)(v1.value1)(v1.value2)(markup(dictMonoid)(tagf)(textf)(Data_Coyoneda.lowerCoyoneda(markupFunctor)(v1.value3)));
                      };
                      if (v1 instanceof Text) {
                          return textf(v1.value0);
                      };
                      throw new Error("Failed pattern match at Web.Markup line 80, column 3 - line 80, column 80: " + [ v1.constructor.name ]);
                  };
                  return Data_Foldable.foldMap(Data_Foldable.foldableArray)(dictMonoid)(node)(v);
              };
          };
      };
  };
  exports["Attr"] = Attr;
  exports["Handler"] = Handler;
  exports["Key"] = Key;
  exports["markup"] = markup;
  exports["tag"] = tag;
  exports["text"] = text;
  exports["markupFunctor"] = markupFunctor;
  exports["markupAlt"] = markupAlt;
  exports["markupPlus"] = markupPlus;
  exports["markupSemigroup"] = markupSemigroup;
  exports["markupMonoid"] = markupMonoid;
  exports["propFunctor"] = propFunctor;
})(PS["Web.Markup"] = PS["Web.Markup"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $$Proxy = (function () {
      function Proxy() {

      };
      Proxy.value = new Proxy();
      return Proxy;
  })();
  exports["Proxy"] = $$Proxy;
})(PS["Type.Proxy"] = PS["Type.Proxy"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Foreign = PS["Data.Foreign"];
  var Type_Proxy = PS["Type.Proxy"];
  var Web_Markup = PS["Web.Markup"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];        
  var Event = function (eventName, eventPayload) {
      this.eventName = eventName;
      this.eventPayload = eventPayload;
  };
  var eventPayload = function (dict) {
      return dict.eventPayload;
  };
  var eventName = function (dict) {
      return dict.eventName;
  };
  var on = function (dictEvent) {
      return function (r) {
          return function (go) {
              return new Web_Markup.Handler(eventName(dictEvent)((Type_Proxy["Proxy"]).value)(r), function ($4) {
                  return go(eventPayload(dictEvent)(r)($4));
              });
          };
      };
  };
  var on_ = function (dictEvent) {
      return function (r) {
          return function (e) {
              return on(dictEvent)(r)(function (v) {
                  return e;
              });
          };
      };
  };
  exports["Event"] = Event;
  exports["eventName"] = eventName;
  exports["eventPayload"] = eventPayload;
  exports["on"] = on;
  exports["on_"] = on_;
})(PS["Web.Markup.Event"] = PS["Web.Markup.Event"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Data_Either = PS["Data.Either"];
  var Data_Foreign_Class = PS["Data.Foreign.Class"];
  var Web_Markup_Event = PS["Web.Markup.Event"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Function = PS["Data.Function"];
  var Control_Category = PS["Control.Category"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Foreign_Index = PS["Data.Foreign.Index"];        
  var MouseUp = (function () {
      function MouseUp() {

      };
      MouseUp.value = new MouseUp();
      return MouseUp;
  })();
  var MouseMove = (function () {
      function MouseMove() {

      };
      MouseMove.value = new MouseMove();
      return MouseMove;
  })();
  var MouseDown = (function () {
      function MouseDown() {

      };
      MouseDown.value = new MouseDown();
      return MouseDown;
  })();
  var mouseUpUnitEvent = new Web_Markup_Event.Event(function (v) {
      return function (v1) {
          return "mouseup";
      };
  }, function (v) {
      return function (v1) {
          return Data_Unit.unit;
      };
  });
  var mouseMoveUnitEvent = new Web_Markup_Event.Event(function (v) {
      return function (v1) {
          return "mousemove";
      };
  }, function (v) {
      return function (v1) {
          return Data_Unit.unit;
      };
  });
  var mouseDownUnitEvent = new Web_Markup_Event.Event(function (v) {
      return function (v1) {
          return "mousedown";
      };
  }, function (v) {
      return function (v1) {
          return Data_Unit.unit;
      };
  });
  exports["MouseDown"] = MouseDown;
  exports["MouseMove"] = MouseMove;
  exports["MouseUp"] = MouseUp;
  exports["mouseDownUnitEvent"] = mouseDownUnitEvent;
  exports["mouseMoveUnitEvent"] = mouseMoveUnitEvent;
  exports["mouseUpUnitEvent"] = mouseUpUnitEvent;
})(PS["Web.Markup.HTML.Event"] = PS["Web.Markup.HTML.Event"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Web_Markup = PS["Web.Markup"];                  
  var class_ = Web_Markup.Attr.create("class");
  exports["class_"] = class_;
})(PS["Web.Markup.HTML.Attributes"] = PS["Web.Markup.HTML.Attributes"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Data_Maybe = PS["Data.Maybe"];
  var Web_Markup = PS["Web.Markup"];        
  var svg = Web_Markup.tag("svg")(Data_Maybe.Nothing.value);
  var line = Web_Markup.tag("line")(Data_Maybe.Nothing.value);
  var g = Web_Markup.tag("g")(Data_Maybe.Nothing.value);
  var circle = Web_Markup.tag("circle")(Data_Maybe.Nothing.value);
  exports["circle"] = circle;
  exports["g"] = g;
  exports["line"] = line;
  exports["svg"] = svg;
})(PS["Web.Markup.SVG"] = PS["Web.Markup.SVG"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Web_Markup = PS["Web.Markup"];        
  var y2 = Web_Markup.Attr.create("y2");
  var y1 = Web_Markup.Attr.create("y1");
  var x2 = Web_Markup.Attr.create("x2");
  var x1 = Web_Markup.Attr.create("x1");
  var width = Web_Markup.Attr.create("width");
  var strokeWidth = Web_Markup.Attr.create("stroke-width");
  var r = Web_Markup.Attr.create("r");
  var height = Web_Markup.Attr.create("height");
  var fill = Web_Markup.Attr.create("fill");
  var cy = Web_Markup.Attr.create("cy");
  var cx = Web_Markup.Attr.create("cx");
  exports["cx"] = cx;
  exports["cy"] = cy;
  exports["fill"] = fill;
  exports["height"] = height;
  exports["r"] = r;
  exports["strokeWidth"] = strokeWidth;
  exports["width"] = width;
  exports["x1"] = x1;
  exports["x2"] = x2;
  exports["y1"] = y1;
  exports["y2"] = y2;
})(PS["Web.Markup.SVG.Attributes"] = PS["Web.Markup.SVG.Attributes"] || {});
(function(exports) {
  /* global exports, require */
  "use strict";
  var incDom =require("incremental-dom"); 

  exports._elementOpenStart = incDom.elementOpenStart;
  exports._elementOpenEnd = incDom.elementOpenEnd;
  exports._elementClose = incDom.elementClose;
  exports._attr = incDom.attr;
  exports._text = incDom.text;
  exports._handler = incDom.attr;
  exports._patch = incDom.patch;
})(PS["Web.Markup.IncDOM"] = PS["Web.Markup.IncDOM"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var $foreign = PS["Web.Markup.IncDOM"];
  var Prelude = PS["Prelude"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Foreign = PS["Data.Foreign"];
  var Data_Function_Eff = PS["Data.Function.Eff"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Maybe_First = PS["Data.Maybe.First"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Nullable = PS["Data.Nullable"];
  var DOM = PS["DOM"];
  var DOM_HTML = PS["DOM.HTML"];
  var DOM_HTML_Document = PS["DOM.HTML.Document"];
  var DOM_HTML_Window = PS["DOM.HTML.Window"];
  var DOM_HTML_Types = PS["DOM.HTML.Types"];
  var Web_Markup = PS["Web.Markup"];
  var Data_Semigroup = PS["Data.Semigroup"];
  var Control_Apply = PS["Control.Apply"];
  var Control_Applicative = PS["Control.Applicative"];
  var Data_Unit = PS["Data.Unit"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Function = PS["Data.Function"];
  var Control_Bind = PS["Control.Bind"];
  var runChained = function (v) {
      return v;
  };
  var renderProp = function (v) {
      if (v instanceof Web_Markup.Attr) {
          return Data_Function_Eff.runEffFn2($foreign._attr)(v.value0)(v.value1);
      };
      if (v instanceof Web_Markup.Handler) {
          return Data_Function_Eff.runEffFn2($foreign._handler)("on" + v.value0)(Data_Function_Eff.mkEffFn1(v.value1));
      };
      return Control_Applicative.pure(Control_Monad_Eff.applicativeEff)(Data_Unit.unit);
  };
  var findKey = function ($17) {
      return Data_Maybe_First.runFirst(Data_Foldable.foldMap(Data_Foldable.foldableArray)(Data_Maybe_First.monoidFirst)(function (p) {
          return Data_Function.apply(Data_Maybe_First.First)((function () {
              if (p instanceof Web_Markup.Key) {
                  return new Data_Maybe.Just(p.value0);
              };
              return Data_Maybe.Nothing.value;
          })());
      })($17));
  };
  var chainedSemigroup = function (dictApply) {
      return new Data_Semigroup.Semigroup(function (v) {
          return function (v1) {
              return Control_Apply.applySecond(dictApply)(v)(v1);
          };
      });
  };
  var chainedMonoid = function (dictApplicative) {
      return new Data_Monoid.Monoid(function () {
          return chainedSemigroup(dictApplicative["__superclass_Control.Apply.Apply_0"]());
      }, Control_Applicative.pure(dictApplicative)(Data_Unit.unit));
  };
  var renderMarkup = function (m) {
      var textf = function (txt) {
          return Data_Function_Eff.runEffFn1($foreign._text)(txt);
      };
      var tagf = function (tn) {
          return function (v) {
              return function (ps) {
                  return function (cs) {
                      return function __do() {
                          Data_Function_Eff.runEffFn2($foreign._elementOpenStart)(tn)(Data_Nullable.toNullable(findKey(ps)))();
                          Data_Foldable.traverse_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableArray)(renderProp)(ps)();
                          $foreign._elementOpenEnd();
                          runChained(cs)();
                          return Data_Function_Eff.runEffFn1($foreign._elementClose)(tn)();
                      };
                  };
              };
          };
      };
      return runChained(Web_Markup.markup(chainedMonoid(Control_Monad_Eff.applicativeEff))(tagf)(textf)(m));
  };
  var renderTo = function (e) {
      return function (m) {
          return Data_Function_Eff.runEffFn2($foreign._patch)(e)(renderMarkup(m));
      };
  };
  var renderToBody = function (m) {
      return function __do() {
          var $18 = Control_Bind.bind(Control_Monad_Eff.bindEff)(Control_Bind.bind(Control_Monad_Eff.bindEff)(DOM_HTML.window)(DOM_HTML_Window.document))(DOM_HTML_Document.body)();
          return Data_Foldable.traverse_(Control_Monad_Eff.applicativeEff)(Data_Foldable.foldableMaybe)(Data_Function.flip(renderTo)(m))(Data_Nullable.toMaybe($18))();
      };
  };
  exports["renderTo"] = renderTo;
  exports["renderToBody"] = renderToBody;
})(PS["Web.Markup.IncDOM"] = PS["Web.Markup.IncDOM"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Array = PS["Data.Array"];
  var Data_Maybe = PS["Data.Maybe"];
  var Data_Tuple_Nested = PS["Data.Tuple.Nested"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Control_Monad_Eff_Timer = PS["Control.Monad.Eff.Timer"];
  var DOM = PS["DOM"];
  var Signal = PS["Signal"];
  var Signal_Channel = PS["Signal.Channel"];
  var Signal_DOM = PS["Signal.DOM"];
  var Signal_Time = PS["Signal.Time"];
  var Web_Markup = PS["Web.Markup"];
  var Web_Markup_IncDOM = PS["Web.Markup.IncDOM"];
  var Graph = PS["Graph"];
  var Force = PS["Force"];
  var Vec2 = PS["Vec2"];
  var Data_Function = PS["Data.Function"];
  var Control_Semigroupoid = PS["Control.Semigroupoid"];
  var Data_Eq = PS["Data.Eq"];
  var Data_Boolean = PS["Data.Boolean"];
  var Control_Bind = PS["Control.Bind"];
  var Data_Functor = PS["Data.Functor"];        
  var Init = (function () {
      function Init() {

      };
      Init.value = new Init();
      return Init;
  })();
  var Held = (function () {
      function Held(value0) {
          this.value0 = value0;
      };
      Held.create = function (value0) {
          return new Held(value0);
      };
      return Held;
  })();
  var Moved = (function () {
      function Moved(value0) {
          this.value0 = value0;
      };
      Moved.create = function (value0) {
          return new Moved(value0);
      };
      return Moved;
  })();
  var Dragged = (function () {
      function Dragged(value0) {
          this.value0 = value0;
      };
      Dragged.create = function (value0) {
          return new Dragged(value0);
      };
      return Dragged;
  })();
  var Released = (function () {
      function Released(value0) {
          this.value0 = value0;
      };
      Released.create = function (value0) {
          return new Released(value0);
      };
      return Released;
  })();
  var Noop = (function () {
      function Noop() {

      };
      Noop.value = new Noop();
      return Noop;
  })();
  var DragStart = (function () {
      function DragStart() {

      };
      DragStart.value = new DragStart();
      return DragStart;
  })();
  var Drag = (function () {
      function Drag(value0, value1) {
          this.value0 = value0;
          this.value1 = value1;
      };
      Drag.create = function (value0) {
          return function (value1) {
              return new Drag(value0, value1);
          };
      };
      return Drag;
  })();
  var DragEnd = (function () {
      function DragEnd() {

      };
      DragEnd.value = new DragEnd();
      return DragEnd;
  })();
  var evolve = function (a) {
      var evolveAction = function (v) {
          return function (rg) {
              if (v instanceof DragStart) {
                  var $13 = {};
                  for (var $14 in rg) {
                      if (rg.hasOwnProperty($14)) {
                          $13[$14] = rg[$14];
                      };
                  };
                  $13.alphaTarget = 0.3;
                  $13.alpha = 1.0;
                  $13.status = "DragStart";
                  return $13;
              };
              if (v instanceof Drag) {
                  var $22 = {};
                  for (var $23 in rg) {
                      if (rg.hasOwnProperty($23)) {
                          $22[$23] = rg[$23];
                      };
                  };
                  $22.graph = (function () {
                      var $19 = {};
                      for (var $20 in rg.graph) {
                          if (rg.graph.hasOwnProperty($20)) {
                              $19[$20] = rg.graph[$20];
                          };
                      };
                      $19.nodes = Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                          return Data_Function.apply(Data_Maybe.fromJust(dictPartial))(Data_Array.modifyAt(v.value0)(function (v1) {
                              var $16 = {};
                              for (var $17 in v1) {
                                  if (v1.hasOwnProperty($17)) {
                                      $16[$17] = v1[$17];
                                  };
                              };
                              $16.coords = Vec2.wrapCP(v.value1);
                              $16.velocity = Vec2.zeroV2;
                              return $16;
                          })(rg.graph.nodes));
                      });
                      return $19;
                  })();
                  $22.status = "Drag";
                  return $22;
              };
              if (v instanceof DragEnd) {
                  var $27 = {};
                  for (var $28 in rg) {
                      if (rg.hasOwnProperty($28)) {
                          $27[$28] = rg[$28];
                      };
                  };
                  $27.alphaTarget = 0.0;
                  $27.status = "DragEnd";
                  return $27;
              };
              if (v instanceof Noop) {
                  var $30 = {};
                  for (var $31 in rg) {
                      if (rg.hasOwnProperty($31)) {
                          $30[$31] = rg[$31];
                      };
                  };
                  $30.status = "Noop";
                  return $30;
              };
              throw new Error("Failed pattern match at UI line 41, column 3 - line 41, column 90: " + [ v.constructor.name, rg.constructor.name ]);
          };
      };
      return function ($52) {
          return evolveAction(a)(Force.evolveForces($52));
      };
  };
  var detectDrag = function (v) {
      return function (v1) {
          if (v instanceof Held && v1 instanceof Init) {
              return v;
          };
          if (v instanceof Held && v1 instanceof Released) {
              return v;
          };
          if (v instanceof Moved && v1 instanceof Held) {
              if (v1.value0 === v.value0) {
                  return new Dragged(v1.value0);
              };
              if (Data_Boolean.otherwise) {
                  return new Moved(v.value0);
              };
          };
          if (v instanceof Moved && v1 instanceof Dragged) {
              if (v1.value0 === v.value0) {
                  return new Dragged(v1.value0);
              };
              if (Data_Boolean.otherwise) {
                  return new Moved(v.value0);
              };
          };
          if (v instanceof Released) {
              return v;
          };
          return Init.value;
      };
  };
  var action = function (v) {
      return function (v1) {
          return function (v2) {
              if (v1 instanceof Held) {
                  return DragStart.value;
              };
              if (v1 instanceof Dragged) {
                  return new Drag(v1.value0, v);
              };
              if (v1 instanceof Released) {
                  return DragEnd.value;
              };
              return Noop.value;
          };
      };
  };
  var runUI = function (render) {
      return function (stInit) {
          return function __do() {
              var v = Signal_Channel.channel(Init.value)();
              var v1 = Signal_DOM.mousePos();
              var v2 = Signal_DOM.animationFrame();
              var feedbackSignal = Signal.foldp(detectDrag)(Init.value)(Signal_Channel.subscribe(v));
              var actionSignal = Signal.squigglyApply(Signal.applySignal)(Signal.squigglyApply(Signal.applySignal)(Signal.squigglyMap(Signal.functorSignal)(action)(Signal.sampleOn(v2)(v1)))(feedbackSignal))(v2);
              var stateSignal = Signal.foldp(evolve)(stInit)(actionSignal);
              return Data_Function.apply(Signal.runSignal)(Signal.squigglyMap(Signal.functorSignal)(Signal.squigglyMap(Data_Functor.functorFn)(Web_Markup_IncDOM.renderToBody)(render(v)))(stateSignal))();
          };
      };
  };
  exports["Noop"] = Noop;
  exports["DragStart"] = DragStart;
  exports["Drag"] = Drag;
  exports["DragEnd"] = DragEnd;
  exports["Init"] = Init;
  exports["Held"] = Held;
  exports["Moved"] = Moved;
  exports["Dragged"] = Dragged;
  exports["Released"] = Released;
  exports["action"] = action;
  exports["detectDrag"] = detectDrag;
  exports["evolve"] = evolve;
  exports["runUI"] = runUI;
})(PS["UI"] = PS["UI"] || {});
(function(exports) {
  // Generated by psc version 0.9.3
  "use strict";
  var Prelude = PS["Prelude"];
  var Partial_Unsafe = PS["Partial.Unsafe"];
  var Data_Foldable = PS["Data.Foldable"];
  var Data_Array = PS["Data.Array"];
  var Data_Array_Partial = PS["Data.Array.Partial"];
  var Data_Monoid = PS["Data.Monoid"];
  var Data_Tuple_Nested = PS["Data.Tuple.Nested"];
  var Control_Monad_Eff = PS["Control.Monad.Eff"];
  var Signal_Channel = PS["Signal.Channel"];
  var Web_Markup = PS["Web.Markup"];
  var Web_Markup_HTML_Event = PS["Web.Markup.HTML.Event"];
  var Web_Markup_HTML_Attributes = PS["Web.Markup.HTML.Attributes"];
  var Web_Markup_Event = PS["Web.Markup.Event"];
  var Web_Markup_SVG = PS["Web.Markup.SVG"];
  var Web_Markup_SVG_Attributes = PS["Web.Markup.SVG.Attributes"];
  var Graph = PS["Graph"];
  var Force = PS["Force"];
  var UI = PS["UI"];
  var Vec2 = PS["Vec2"];
  var Util = PS["Util"];
  var Data_Unit = PS["Data.Unit"];
  var Data_Function = PS["Data.Function"];
  var Data_Functor = PS["Data.Functor"];
  var Data_Semigroup = PS["Data.Semigroup"];        
  var testGraph = Graph.mkGraph([ {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "red"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "blue"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "blue"
  }, {
      color: "black"
  }, {
      color: "black"
  }, {
      color: "magenta"
  }, {
      color: "black"
  }, {
      color: "green"
  }, {
      color: "yellow"
  }, {
      color: "blue"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "yellow"
  }, {
      color: "black"
  }, {
      color: "cyan"
  }, {
      color: "black"
  }, {
      color: "black"
  }, {
      color: "magenta"
  }, {
      color: "green"
  }, {
      color: "green"
  }, {
      color: "grey"
  }, {
      color: "grey"
  }, {
      color: "orange"
  }, {
      color: "magenta"
  }, {
      color: "magenta"
  }, {
      color: "magenta"
  }, {
      color: "magenta"
  }, {
      color: "magenta"
  }, {
      color: "magenta"
  }, {
      color: "orange"
  }, {
      color: "magenta"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "orange"
  }, {
      color: "beige"
  }, {
      color: "black"
  }, {
      color: "black"
  }, {
      color: "black"
  }, {
      color: "black"
  }, {
      color: "magenta"
  }, {
      color: "indigo"
  }, {
      color: "indigo"
  }, {
      color: "black"
  }, {
      color: "orange"
  } ])([ new Graph.Link(1, 0, Data_Unit.unit), new Graph.Link(2, 0, Data_Unit.unit), new Graph.Link(3, 0, Data_Unit.unit), new Graph.Link(3, 2, Data_Unit.unit), new Graph.Link(4, 0, Data_Unit.unit), new Graph.Link(5, 0, Data_Unit.unit), new Graph.Link(6, 0, Data_Unit.unit), new Graph.Link(7, 0, Data_Unit.unit), new Graph.Link(8, 0, Data_Unit.unit), new Graph.Link(9, 0, Data_Unit.unit), new Graph.Link(11, 10, Data_Unit.unit), new Graph.Link(11, 3, Data_Unit.unit), new Graph.Link(11, 2, Data_Unit.unit), new Graph.Link(11, 0, Data_Unit.unit), new Graph.Link(12, 11, Data_Unit.unit), new Graph.Link(13, 11, Data_Unit.unit), new Graph.Link(14, 11, Data_Unit.unit), new Graph.Link(15, 11, Data_Unit.unit), new Graph.Link(17, 16, Data_Unit.unit), new Graph.Link(18, 16, Data_Unit.unit), new Graph.Link(18, 17, Data_Unit.unit), new Graph.Link(19, 16, Data_Unit.unit), new Graph.Link(19, 17, Data_Unit.unit), new Graph.Link(19, 18, Data_Unit.unit), new Graph.Link(20, 16, Data_Unit.unit), new Graph.Link(20, 17, Data_Unit.unit), new Graph.Link(20, 18, Data_Unit.unit), new Graph.Link(20, 19, Data_Unit.unit), new Graph.Link(21, 16, Data_Unit.unit), new Graph.Link(21, 17, Data_Unit.unit), new Graph.Link(21, 18, Data_Unit.unit), new Graph.Link(21, 19, Data_Unit.unit), new Graph.Link(21, 20, Data_Unit.unit), new Graph.Link(22, 16, Data_Unit.unit), new Graph.Link(22, 17, Data_Unit.unit), new Graph.Link(22, 18, Data_Unit.unit), new Graph.Link(22, 19, Data_Unit.unit), new Graph.Link(22, 20, Data_Unit.unit), new Graph.Link(22, 21, Data_Unit.unit), new Graph.Link(23, 16, Data_Unit.unit), new Graph.Link(23, 17, Data_Unit.unit), new Graph.Link(23, 18, Data_Unit.unit), new Graph.Link(23, 19, Data_Unit.unit), new Graph.Link(23, 20, Data_Unit.unit), new Graph.Link(23, 21, Data_Unit.unit), new Graph.Link(23, 22, Data_Unit.unit), new Graph.Link(23, 12, Data_Unit.unit), new Graph.Link(23, 11, Data_Unit.unit), new Graph.Link(24, 23, Data_Unit.unit), new Graph.Link(24, 11, Data_Unit.unit), new Graph.Link(25, 24, Data_Unit.unit), new Graph.Link(25, 23, Data_Unit.unit), new Graph.Link(25, 11, Data_Unit.unit), new Graph.Link(26, 24, Data_Unit.unit), new Graph.Link(26, 11, Data_Unit.unit), new Graph.Link(26, 16, Data_Unit.unit), new Graph.Link(26, 25, Data_Unit.unit), new Graph.Link(27, 11, Data_Unit.unit), new Graph.Link(27, 23, Data_Unit.unit), new Graph.Link(27, 25, Data_Unit.unit), new Graph.Link(27, 24, Data_Unit.unit), new Graph.Link(27, 26, Data_Unit.unit), new Graph.Link(28, 11, Data_Unit.unit), new Graph.Link(28, 27, Data_Unit.unit), new Graph.Link(29, 23, Data_Unit.unit), new Graph.Link(29, 27, Data_Unit.unit), new Graph.Link(29, 11, Data_Unit.unit), new Graph.Link(30, 23, Data_Unit.unit), new Graph.Link(31, 30, Data_Unit.unit), new Graph.Link(31, 11, Data_Unit.unit), new Graph.Link(31, 23, Data_Unit.unit), new Graph.Link(31, 27, Data_Unit.unit), new Graph.Link(32, 11, Data_Unit.unit), new Graph.Link(33, 11, Data_Unit.unit), new Graph.Link(33, 27, Data_Unit.unit), new Graph.Link(34, 11, Data_Unit.unit), new Graph.Link(34, 29, Data_Unit.unit), new Graph.Link(35, 11, Data_Unit.unit), new Graph.Link(35, 34, Data_Unit.unit), new Graph.Link(35, 29, Data_Unit.unit), new Graph.Link(36, 34, Data_Unit.unit), new Graph.Link(36, 35, Data_Unit.unit), new Graph.Link(36, 11, Data_Unit.unit), new Graph.Link(36, 29, Data_Unit.unit), new Graph.Link(37, 34, Data_Unit.unit), new Graph.Link(37, 35, Data_Unit.unit), new Graph.Link(37, 36, Data_Unit.unit), new Graph.Link(37, 11, Data_Unit.unit), new Graph.Link(37, 29, Data_Unit.unit), new Graph.Link(38, 34, Data_Unit.unit), new Graph.Link(38, 35, Data_Unit.unit), new Graph.Link(38, 36, Data_Unit.unit), new Graph.Link(38, 37, Data_Unit.unit), new Graph.Link(38, 11, Data_Unit.unit), new Graph.Link(38, 29, Data_Unit.unit), new Graph.Link(39, 25, Data_Unit.unit), new Graph.Link(40, 25, Data_Unit.unit), new Graph.Link(41, 24, Data_Unit.unit), new Graph.Link(41, 25, Data_Unit.unit), new Graph.Link(42, 41, Data_Unit.unit), new Graph.Link(42, 25, Data_Unit.unit), new Graph.Link(42, 24, Data_Unit.unit), new Graph.Link(43, 11, Data_Unit.unit), new Graph.Link(43, 26, Data_Unit.unit), new Graph.Link(43, 27, Data_Unit.unit), new Graph.Link(44, 28, Data_Unit.unit), new Graph.Link(44, 11, Data_Unit.unit), new Graph.Link(45, 28, Data_Unit.unit), new Graph.Link(47, 46, Data_Unit.unit), new Graph.Link(48, 47, Data_Unit.unit), new Graph.Link(48, 25, Data_Unit.unit), new Graph.Link(48, 27, Data_Unit.unit), new Graph.Link(48, 11, Data_Unit.unit), new Graph.Link(49, 26, Data_Unit.unit), new Graph.Link(49, 11, Data_Unit.unit), new Graph.Link(50, 49, Data_Unit.unit), new Graph.Link(50, 24, Data_Unit.unit), new Graph.Link(51, 49, Data_Unit.unit), new Graph.Link(51, 26, Data_Unit.unit), new Graph.Link(51, 11, Data_Unit.unit), new Graph.Link(52, 51, Data_Unit.unit), new Graph.Link(52, 39, Data_Unit.unit), new Graph.Link(53, 51, Data_Unit.unit), new Graph.Link(54, 51, Data_Unit.unit), new Graph.Link(54, 49, Data_Unit.unit), new Graph.Link(54, 26, Data_Unit.unit), new Graph.Link(55, 51, Data_Unit.unit), new Graph.Link(55, 49, Data_Unit.unit), new Graph.Link(55, 39, Data_Unit.unit), new Graph.Link(55, 54, Data_Unit.unit), new Graph.Link(55, 26, Data_Unit.unit), new Graph.Link(55, 11, Data_Unit.unit), new Graph.Link(55, 16, Data_Unit.unit), new Graph.Link(55, 25, Data_Unit.unit), new Graph.Link(55, 41, Data_Unit.unit), new Graph.Link(55, 48, Data_Unit.unit), new Graph.Link(56, 49, Data_Unit.unit), new Graph.Link(56, 55, Data_Unit.unit), new Graph.Link(57, 55, Data_Unit.unit), new Graph.Link(57, 41, Data_Unit.unit), new Graph.Link(57, 48, Data_Unit.unit), new Graph.Link(58, 55, Data_Unit.unit), new Graph.Link(58, 48, Data_Unit.unit), new Graph.Link(58, 27, Data_Unit.unit), new Graph.Link(58, 57, Data_Unit.unit), new Graph.Link(58, 11, Data_Unit.unit), new Graph.Link(59, 58, Data_Unit.unit), new Graph.Link(59, 55, Data_Unit.unit), new Graph.Link(59, 48, Data_Unit.unit), new Graph.Link(59, 57, Data_Unit.unit), new Graph.Link(60, 48, Data_Unit.unit), new Graph.Link(60, 58, Data_Unit.unit), new Graph.Link(60, 59, Data_Unit.unit), new Graph.Link(61, 48, Data_Unit.unit), new Graph.Link(61, 58, Data_Unit.unit), new Graph.Link(61, 60, Data_Unit.unit), new Graph.Link(61, 59, Data_Unit.unit), new Graph.Link(61, 57, Data_Unit.unit), new Graph.Link(61, 55, Data_Unit.unit), new Graph.Link(62, 55, Data_Unit.unit), new Graph.Link(62, 58, Data_Unit.unit), new Graph.Link(62, 59, Data_Unit.unit), new Graph.Link(62, 48, Data_Unit.unit), new Graph.Link(62, 57, Data_Unit.unit), new Graph.Link(62, 41, Data_Unit.unit), new Graph.Link(62, 61, Data_Unit.unit), new Graph.Link(62, 60, Data_Unit.unit), new Graph.Link(63, 59, Data_Unit.unit), new Graph.Link(63, 48, Data_Unit.unit), new Graph.Link(63, 62, Data_Unit.unit), new Graph.Link(63, 57, Data_Unit.unit), new Graph.Link(63, 58, Data_Unit.unit), new Graph.Link(63, 61, Data_Unit.unit), new Graph.Link(63, 60, Data_Unit.unit), new Graph.Link(63, 55, Data_Unit.unit), new Graph.Link(64, 55, Data_Unit.unit), new Graph.Link(64, 62, Data_Unit.unit), new Graph.Link(64, 48, Data_Unit.unit), new Graph.Link(64, 63, Data_Unit.unit), new Graph.Link(64, 58, Data_Unit.unit), new Graph.Link(64, 61, Data_Unit.unit), new Graph.Link(64, 60, Data_Unit.unit), new Graph.Link(64, 59, Data_Unit.unit), new Graph.Link(64, 57, Data_Unit.unit), new Graph.Link(64, 11, Data_Unit.unit), new Graph.Link(65, 63, Data_Unit.unit), new Graph.Link(65, 64, Data_Unit.unit), new Graph.Link(65, 48, Data_Unit.unit), new Graph.Link(65, 62, Data_Unit.unit), new Graph.Link(65, 58, Data_Unit.unit), new Graph.Link(65, 61, Data_Unit.unit), new Graph.Link(65, 60, Data_Unit.unit), new Graph.Link(65, 59, Data_Unit.unit), new Graph.Link(65, 57, Data_Unit.unit), new Graph.Link(65, 55, Data_Unit.unit), new Graph.Link(66, 64, Data_Unit.unit), new Graph.Link(66, 58, Data_Unit.unit), new Graph.Link(66, 59, Data_Unit.unit), new Graph.Link(66, 62, Data_Unit.unit), new Graph.Link(66, 65, Data_Unit.unit), new Graph.Link(66, 48, Data_Unit.unit), new Graph.Link(66, 63, Data_Unit.unit), new Graph.Link(66, 61, Data_Unit.unit), new Graph.Link(66, 60, Data_Unit.unit), new Graph.Link(67, 57, Data_Unit.unit), new Graph.Link(68, 25, Data_Unit.unit), new Graph.Link(68, 11, Data_Unit.unit), new Graph.Link(68, 24, Data_Unit.unit), new Graph.Link(68, 27, Data_Unit.unit), new Graph.Link(68, 48, Data_Unit.unit), new Graph.Link(68, 41, Data_Unit.unit), new Graph.Link(69, 25, Data_Unit.unit), new Graph.Link(69, 68, Data_Unit.unit), new Graph.Link(69, 11, Data_Unit.unit), new Graph.Link(69, 24, Data_Unit.unit), new Graph.Link(69, 27, Data_Unit.unit), new Graph.Link(69, 48, Data_Unit.unit), new Graph.Link(69, 41, Data_Unit.unit), new Graph.Link(70, 25, Data_Unit.unit), new Graph.Link(70, 69, Data_Unit.unit), new Graph.Link(70, 68, Data_Unit.unit), new Graph.Link(70, 11, Data_Unit.unit), new Graph.Link(70, 24, Data_Unit.unit), new Graph.Link(70, 27, Data_Unit.unit), new Graph.Link(70, 41, Data_Unit.unit), new Graph.Link(70, 58, Data_Unit.unit), new Graph.Link(71, 27, Data_Unit.unit), new Graph.Link(71, 69, Data_Unit.unit), new Graph.Link(71, 68, Data_Unit.unit), new Graph.Link(71, 70, Data_Unit.unit), new Graph.Link(71, 11, Data_Unit.unit), new Graph.Link(71, 48, Data_Unit.unit), new Graph.Link(71, 41, Data_Unit.unit), new Graph.Link(71, 25, Data_Unit.unit), new Graph.Link(72, 26, Data_Unit.unit), new Graph.Link(72, 27, Data_Unit.unit), new Graph.Link(72, 11, Data_Unit.unit), new Graph.Link(73, 48, Data_Unit.unit), new Graph.Link(74, 48, Data_Unit.unit), new Graph.Link(74, 73, Data_Unit.unit), new Graph.Link(75, 69, Data_Unit.unit), new Graph.Link(75, 68, Data_Unit.unit), new Graph.Link(75, 25, Data_Unit.unit), new Graph.Link(75, 48, Data_Unit.unit), new Graph.Link(75, 41, Data_Unit.unit), new Graph.Link(75, 70, Data_Unit.unit), new Graph.Link(75, 71, Data_Unit.unit), new Graph.Link(76, 64, Data_Unit.unit), new Graph.Link(76, 65, Data_Unit.unit), new Graph.Link(76, 66, Data_Unit.unit), new Graph.Link(76, 63, Data_Unit.unit), new Graph.Link(76, 62, Data_Unit.unit), new Graph.Link(76, 48, Data_Unit.unit), new Graph.Link(76, 58, Data_Unit.unit) ]);
  var render = function (ch) {
      return function (st) {
          var renderNodes = Data_Function.applyFlipped(st.graph.nodes)(Data_Array.mapWithIndex(function (i) {
              return function (n) {
                  var c = Vec2.runVec2(n.coords);
                  return Web_Markup_SVG.circle([ Data_Function.apply(Web_Markup_SVG_Attributes.cx)(Util.format(c.x)), Data_Function.apply(Web_Markup_SVG_Attributes.cy)(Util.format(c.y)), Web_Markup_SVG_Attributes.r("5"), Web_Markup_SVG_Attributes.fill(n.payload.color), Web_Markup_Event.on_(Web_Markup_HTML_Event.mouseDownUnitEvent)(Web_Markup_HTML_Event.MouseDown.value)(Data_Function.apply(Signal_Channel.send(ch))(new UI.Held(i))), Web_Markup_Event.on_(Web_Markup_HTML_Event.mouseMoveUnitEvent)(Web_Markup_HTML_Event.MouseMove.value)(Data_Function.apply(Signal_Channel.send(ch))(new UI.Moved(i))), Web_Markup_Event.on_(Web_Markup_HTML_Event.mouseUpUnitEvent)(Web_Markup_HTML_Event.MouseUp.value)(Data_Function.apply(Signal_Channel.send(ch))(new UI.Released(i))) ])(Data_Monoid.mempty(Web_Markup.markupMonoid));
              };
          }));
          var renderLinks = Data_Functor.mapFlipped(Data_Functor.functorArray)(st.graph.links)(function (v) {
              var n2 = Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                  return Data_Array_Partial.unsafeIndex(dictPartial)(st.graph.nodes)(v.value1);
              });
              var n1 = Data_Function.apply(Partial_Unsafe.unsafePartial)(function (dictPartial) {
                  return Data_Array_Partial.unsafeIndex(dictPartial)(st.graph.nodes)(v.value0);
              });
              var c2 = Vec2.runVec2(n2.coords);
              var c1 = Vec2.runVec2(n1.coords);
              return Web_Markup_SVG.line([ Web_Markup_SVG_Attributes.strokeWidth("1"), Data_Function.apply(Web_Markup_SVG_Attributes.x1)(Util.format(c1.x)), Data_Function.apply(Web_Markup_SVG_Attributes.x2)(Util.format(c2.x)), Data_Function.apply(Web_Markup_SVG_Attributes.y1)(Util.format(c1.y)), Data_Function.apply(Web_Markup_SVG_Attributes.y2)(Util.format(c2.y)) ])(Data_Monoid.mempty(Web_Markup.markupMonoid));
          });
          return Data_Function.apply(Web_Markup_SVG.svg([ Web_Markup_SVG_Attributes.width("100%"), Web_Markup_SVG_Attributes.height("100%") ]))(Data_Semigroup.append(Web_Markup.markupSemigroup)(Data_Function.apply(Web_Markup_SVG.g([ Web_Markup_HTML_Attributes.class_("links") ]))(Data_Foldable.fold(Data_Foldable.foldableArray)(Web_Markup.markupMonoid)(renderLinks)))(Data_Semigroup.append(Web_Markup.markupSemigroup)(Data_Function.apply(Web_Markup_SVG.g([ Web_Markup_HTML_Attributes.class_("nodes") ]))(Data_Foldable.fold(Data_Foldable.foldableArray)(Web_Markup.markupMonoid)(renderNodes)))(Data_Function.apply(Web_Markup_SVG.g([ Web_Markup_HTML_Attributes.class_("text") ]))(Web_Markup.text(st.status)))));
      };
  };
  var center = {
      x: 800.0, 
      y: 400.0
  };
  var state = Force.mkRenderGraph(center)(1.0e-3)(testGraph);
  var main = UI.runUI(render)(state);
  exports["center"] = center;
  exports["main"] = main;
  exports["render"] = render;
  exports["state"] = state;
  exports["testGraph"] = testGraph;
})(PS["Main"] = PS["Main"] || {});
PS["Main"].main();

}).call(this,require('_process'))
},{"_process":1,"incremental-dom":2}]},{},[3]);
