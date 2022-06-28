import React, { Component } from 'react';
import { NavLink } from 'react-router-dom';

class WashersDryers extends Component {

    componentDidMount() {
        console.log('test');
        window.addEventListener('message', function (e) {
            if (e.type !== 'message' || !e.data) return;

            if (e.data.messageType === 'hulla_resize' && e.data.appId === 'hulla') {
                if (e.data.height) {
                    document.querySelector('#hulla').style.height = (e.data.height + 60) + 'px';
                    document.querySelector('#hulla > iframe').style.height = (e.data.height + 60) + 'px';
                }
            }
        });

        function sendScrollEvent() {
            var appDiv = document.querySelector("#hulla");
            var hullaIframe = document.querySelector('#hullaIframe');
            if (hullaIframe && hullaIframe.contentWindow) {
                hullaIframe
                    .contentWindow.postMessage('hulla_scroll::' + JSON.stringify({
                        screenTop: window.screenTop,
                        screenLeft: window.screenLeft,
                        scrollX: window.scrollX,
                        scrollY: window.scrollY,
                        innerHeight: window.innerHeight,
                        outerHeight: window.outerHeight,
                        boundingRect: hullaIframe.getBoundingClientRect(),
                        offsetTop: appDiv.offsetTop,
                        offsetLeft: appDiv.offsetLeft
                    }), '*');
            }
        }

        window.onscroll = sendScrollEvent;

        document.querySelector('#hulla').style.height = (window.innerHeight * 1.5) + 'px';
        document.querySelector('#hulla > iframe').style.height = (window.innerHeight * 1.5) + 'px';

        const MESSAGE_TYPE = 'hulla_function'
        const ERROR_TYPE = 'hulla_function_error'
        const ASYNC_MESSAGE_TYPE = 'hulla_async_function'
        const TICK = 2500
        const MAX_TRIES = 30
        const queue = []
        let _eventSource
        let appInitialised = false

        function flushQueue(eventSource, handlers) {
            for (const event of queue) {
                processAsyncHandler(eventSource, event, handlers)
            }
        }

        function serialiseError(error) {
            return {
                name: 'PostMessageError',
                message: error.message || error,
                stack: error.stack || ''
            }
        }

        function processAsyncHandler(eventSource, { handler, payload }, handlers) {
            if (handler in handlers) {
                handlers[handler](payload).then(function (_payload) {
                    eventSource.postMessage({
                        messageType: ASYNC_MESSAGE_TYPE,
                        handler,
                        payload: _payload
                    }, '*')
                }).catch(function (error) {
                    eventSource.postMessage({
                        messageType: ASYNC_MESSAGE_TYPE,
                        handler,
                        error
                    }, '*')
                })
            } else {
                console.warn(`(processAsyncHandler) handler ${handler} not found!`)
            }
        }

        function postMessageInit(handlers) {
            window.addEventListener('message', function (event) {
                if (typeof event.data !== 'object') {
                    return
                }

                const { messageType, handler, payload, error } = event.data

                try {
                    switch (messageType) {
                        case MESSAGE_TYPE:
                            if (handler === '$appInit') {
                                appInitialised = true
                                _eventSource = event.source
                                flushQueue(event.source, handlers)
                                return
                            }

                            if (handler in handlers) {
                                handlers[handler]({
                                    send(_handler, _payload) {
                                        event.source.postMessage({
                                            messageType: MESSAGE_TYPE,
                                            handler: _handler,
                                            payload: _payload
                                        }, '*')
                                    }
                                }, payload)
                            } else {
                                throw new Error(`handler '${handler}' not found!`)
                            }

                            break

                        case ERROR_TYPE:
                            event.source.postMessage({
                                messageType: ERROR_TYPE,
                                error: error
                            }, '*')

                            break

                        case ASYNC_MESSAGE_TYPE:
                            if (!appInitialised) {
                                queue.push(event.data)
                                return
                            }

                            processAsyncHandler(_eventSource, { handler, payload }, handlers)
                            break

                    }
                } catch (error) {
                    if (appInitialised) {
                        event.source.postMessage({
                            messageType: ERROR_TYPE,
                            error: serialiseError(error)
                        }, '*')
                    } else {
                        queue.push({
                            messageType: ERROR_TYPE,
                            error: serialiseError(error)
                        })
                    }
                }
            })

            for (const name in handlers) {
                if (name.startsWith('_')) {
                    function send(_handler, _payload) {
                        let i = 0

                        return new Promise(function (resolve, reject) {
                            function loop() {
                                if (!appInitialised) {
                                    if (i++ >= MAX_TRIES) {
                                        return reject(new Error('app timed out.'))
                                    }

                                    setTimeout(loop, TICK)
                                } else {
                                    _eventSource.postMessage({
                                        messageType: MESSAGE_TYPE,
                                        handler: _handler,
                                        payload: _payload
                                    }, '*')
                                    resolve()
                                }
                            }

                            loop()
                        })
                    }

                    handlers[name]({ send })
                }
            }
        }

        const handlers = {
            "getPageInfo": function getPageInfo(_, payload) {
                return new Promise(function (resolve) {
                    resolve({
                        href: window.location.href,
                        origin: window.location.origin,
                        pathname: window.location.pathname
                    })
                })
            },
            "changeQueryString": function changeQueryString(_, params) {
                window.history.pushState({}, '', window.location.origin + window.location.pathname + '?' + params)
            },
            "hullaTrackEvent": function hullaTrackEvent(context, payload) {
                if (!payload) return
                if (window && window.hullaEvent) {
                    window.hullaEvent(payload)
                }
            },
            "productClickthroughRedirect": function productClickthroughRedirect(context, postMessageObj) {
                console.log(postMessageObj)
                console.log(context)
            },
            "categoryClickthroughRedirect": function productClickthroughRedirect(context, postMessageObj) {
                console.log(postMessageObj)
                console.log(context)
            },
            "handleCategoryInit": function handleCategoryInit(context) {
                console.log("SETTING UP LISTENER")
                window.addEventListener('message', function (payload) {
                    console.log('message received')
                    if (payload && payload.data['hulla-message']) {
                        context.send('categoryForInit', payload.data['hulla-message'])
                    }
                })
            }
        }

        function changeIframeSrc(iframe, src) {
            const frame = iframe.cloneNode();
            frame.src = src;
            iframe.parentNode.replaceChild(frame, iframe);
        };

        const iframe = document.querySelector('#hulla > iframe')

        // Option 1 (original)
        // iframe.src = "https://trail-appliances-plp-washers-dryers.hulla-cdn.com/?hulla_origin=" + window.location.href

        // Option 2
        // changeIframeSrc(iframe, `https://trail-appliances-plp.hulla-cdn.com/?hulla_origin=${window.location.href}`)

        // Option 3
        iframe.contentWindow.location.replace(`https://trail-appliances-plp.hulla-cdn.com/?hulla_origin=${window.location.href}`)

        postMessageInit(handlers)
    }

    render() {
        return (
            <div>
                <h1>Test site</h1>
                <nav>
                    <NavLink to="/">Home</NavLink>
                    <NavLink to="/cooking">Cooking</NavLink>
                </nav>
                <div id="hulla">
                    <iframe src="" title="hulla iframe"></iframe>
                </div>
            </div>
        );
    }
};

export default WashersDryers;