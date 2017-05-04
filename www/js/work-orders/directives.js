angular.module('app.work-orders.directives', [])
.constant('SIGNATURE_EVENTS', {
    save: 'signature.save',
    clear: 'signature.clear',
    open: 'signature.open'
})
.directive('signatureCanvas', ['SIGNATURE_EVENTS', function (SIGNATURE_EVENTS) {
    return {
        restrict: 'AE',
        scope: {
            options: '=',
            version: '='
        },
        template: '<div style="z-index: 10; position: absolute"></div>',
        link: function postLink(scope, elm) {

            var isTouch = !!('ontouchstart' in window);

            var PAINT_START = isTouch ? 'touchstart' : 'mousedown';
            var PAINT_MOVE = isTouch ? 'touchmove' : 'mousemove';
            var PAINT_END = isTouch ? 'touchend' : 'mouseup';

            //set default options
            var options = scope.options;
            options.canvasId = options.customCanvasId || 'pwCanvasMain';
            options.tmpCanvasId = options.customCanvasId ? (options.canvasId + 'Tmp') : 'pwCanvasTmp';
            options.width = options.width || 0;
            options.height = options.height || 0;
            options.backgroundColor = options.backgroundColor || '#fff';
            options.color = options.color || '#000';
            options.undoEnabled = options.undoEnabled || false;
            options.opacity = options.opacity || 1;
            options.lineWidth = options.lineWidth || 2;
            options.undo = options.undo || false;

            //create canvas and context
            var canvas = document.createElement('canvas');
            canvas.id = options.canvasId;
            var canvasTmp = document.createElement('canvas');
            canvasTmp.id = options.tmpCanvasId;
            angular.element(canvasTmp).css({
                position: 'absolute',
                top: 0,
                left: 0
            });
            elm.find('div').append(canvas);
            elm.find('div').append(canvasTmp);
            var ctx = canvas.getContext('2d');
            var ctxTmp = canvasTmp.getContext('2d');

            //inti variables
            var point = {
                x: 0,
                y: 0
            };
            var ppts = [];

            //set canvas size
            canvas.width = canvasTmp.width = options.width;
            canvas.height = canvasTmp.height = options.height;

            scope.$on(SIGNATURE_EVENTS.open, function(){
                var container = (elm.find('div').parent().parent().parent()[0]);
                canvas.width = canvasTmp.width = container.offsetWidth;
                canvas.height = canvasTmp.height = container.offsetHeight;
                options.notEmpty = false;
            });

            scope.$on(SIGNATURE_EVENTS.clear, function(){
                ctxTmp.clearRect(0, 0, canvasTmp.width, canvasTmp.height);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                options.notEmpty = false;
            });

            scope.$on(SIGNATURE_EVENTS.save, function(){
                var signatureImage = canvas.toDataURL();
                options.dataUrl = signatureImage;
            });

                //set context style
            ctx.fillStyle = options.backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctxTmp.globalAlpha = options.opacity;
            ctxTmp.lineJoin = ctxTmp.lineCap = 'round';
            ctxTmp.lineWidth = options.lineWidth;
            ctxTmp.strokeStyle = options.color;


            //Watch options
            var getOffset = function (elem) {
                var offsetTop = 0;
                var offsetLeft = 0;
                do {
                    if (!isNaN(elem.offsetLeft)) {
                        offsetTop += elem.offsetTop;
                        offsetLeft += elem.offsetLeft;
                    }
                    elem = elem.offsetParent;
                } while (elem);
                return {
                    left: offsetLeft,
                    top: offsetTop
                };
            };

            var setPointFromEvent = function (point, e) {
                if (isTouch) {
                    point.x = e.changedTouches[0].pageX - getOffset(e.target).left;
                    point.y = e.changedTouches[0].pageY - getOffset(e.target).top;
                } else {
                    point.x = e.offsetX !== undefined ? e.offsetX : e.layerX;
                    point.y = e.offsetY !== undefined ? e.offsetY : e.layerY;
                }
            };


            var paint = function (e) {
                if (e) {
                    e.preventDefault();
                    setPointFromEvent(point, e);
                }

                // Saving all the points in an array
                ppts.push({
                    x: point.x,
                    y: point.y
                });

                if (ppts.length === 3) {

                    options.notEmpty = true;

                    var b = ppts[0];
                    ctxTmp.beginPath();
                    ctxTmp.arc(b.x, b.y, ctxTmp.lineWidth / 2, 0, Math.PI * 2, !0);
                    ctxTmp.fill();
                    ctxTmp.closePath();
                    return;
                }

                // Tmp canvas is always cleared up before drawing.
                ctxTmp.clearRect(0, 0, canvasTmp.width, canvasTmp.height);

                ctxTmp.beginPath();
                ctxTmp.moveTo(ppts[0].x, ppts[0].y);

                for (var i = 1; i < ppts.length - 2; i++) {
                    var c = (ppts[i].x + ppts[i + 1].x) / 2;
                    var d = (ppts[i].y + ppts[i + 1].y) / 2;
                    ctxTmp.quadraticCurveTo(ppts[i].x, ppts[i].y, c, d);
                }

                // For the last 2 points
                ctxTmp.quadraticCurveTo(
                    ppts[i].x,
                    ppts[i].y,
                    ppts[i + 1].x,
                    ppts[i + 1].y
                );
                ctxTmp.stroke();
            };

            var startTmpImage = function (e) {
                e.preventDefault();
                canvasTmp.addEventListener(PAINT_MOVE, paint, false);

                setPointFromEvent(point, e);
                ppts.push({
                    x: point.x,
                    y: point.y
                });
                ppts.push({
                    x: point.x,
                    y: point.y
                });

                paint();
            };

            var copyTmpImage = function () {
                if (options.undo) {
                    scope.$apply(function () {
                        undoCache.push(ctx.getImageData(0, 0, canvasTmp.width, canvasTmp.height));
                        if (angular.isNumber(options.undo) && options.undo > 0) {
                            undoCache = undoCache.slice(-1 * options.undo);
                        }
                    });
                }
                canvasTmp.removeEventListener(PAINT_MOVE, paint, false);
                ctx.drawImage(canvasTmp, 0, 0);
                ctxTmp.clearRect(0, 0, canvasTmp.width, canvasTmp.height);
                ppts = [];
            };

            var initListeners = function () {

                canvasTmp.addEventListener(PAINT_START, startTmpImage, false);
                canvasTmp.addEventListener(PAINT_END, copyTmpImage, false);

                if (!isTouch) {
                    var MOUSE_DOWN;

                    document.body.addEventListener('mousedown', mousedown);
                    document.body.addEventListener('mouseup', mouseup);

                    scope.$on('$destroy', removeEventListeners);

                    canvasTmp.addEventListener('mouseenter', mouseenter);
                    canvasTmp.addEventListener('mouseleave', mouseleave);
                }

                function mousedown() {
                    MOUSE_DOWN = true;
                }

                function mouseup() {
                    MOUSE_DOWN = false;
                }

                function removeEventListeners() {
                    document.body.removeEventListener('mousedown', mousedown);
                    document.body.removeEventListener('mouseup', mouseup);
                }

                function mouseenter(e) {
                    // If the mouse is down when it enters the canvas, start a path
                    if (MOUSE_DOWN) {
                        startTmpImage(e);
                    }
                }

                function mouseleave(e) {
                    // If the mouse is down when it leaves the canvas, end the path
                    if (MOUSE_DOWN) {
                        copyTmpImage(e);
                    }
                }
            };

            initListeners();
        }
    };
}]);
