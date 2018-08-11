/**
 * Configs
 */
var basicCodeText = '// Código em Javascript\n\n';

var Code = {};

var outputArea = document.getElementById('output');
var codeOutput = document.getElementById('codigo')
var blocklyArea = document.getElementById('blocklyArea');
var blocklyDiv = document.getElementById('blocklyDiv');
var myInterpreter = null;
var runner;

var latestCode = '';

var building = false;

Code.init = function () {

    initSVG();

    // Exit is used to signal the end of a script.
    Blockly.JavaScript.addReservedWords('exit');

    document.getElementById('codigo').innerHTML = basicCodeText;


    var onResize = function () {
        // Compute the absolute coordinates and dimensions of blocklyArea.
        var element = blocklyArea;
        var x = 0;
        var y = 0;
        do {
            x += element.offsetLeft;
            y += element.offsetTop;
            element = element.offsetParent;
        } while (element);
        // Position blocklyDiv over blocklyArea.
        blocklyDiv.style.left = x + 'px';
        blocklyDiv.style.top = y + 'px';
        blocklyDiv.style.width = blocklyArea.offsetWidth + 'px';
        blocklyDiv.style.height = (blocklyArea.offsetHeight - 30) + 'px';

        Blockly.svgResize(Code.workspacePlayground);
    }

    window.addEventListener('resize', onResize, false);

    for (var messageKey in MSG) {
        if (messageKey.indexOf('cat') == 0) {
            Blockly.Msg[messageKey.toUpperCase()] = MSG[messageKey];
        }
    }

    // Construct the toolbox XML, replacing translated variable names.
    var toolboxText = document.getElementById('toolbox').outerHTML;
    toolboxText = toolboxText.replace(/(^|[^%]){(\w+)}/g,
        function (m, p1, p2) {
            return p1 + MSG[p2];
        });
    var toolboxXml = Blockly.Xml.textToDom(toolboxText);

    Code.workspacePlayground = Blockly.inject('blocklyDiv', {
        toolbox: document.getElementById('toolbox'),
        grid: {
            spacing: 20,
            length: 3,
            colour: '#ccc',
            snap: true
        },
        zoom: {
            controls: true,
            wheel: false,
            startScale: 1.0,
            maxScale: 3,
            minScale: 0.3,
            scaleSpeed: 1.2
        },
    });

    Code.workspacePlayground.addChangeListener(UpdateCode);

    onResize();

    fillCode();

    /** Bind events */
    document.getElementById('exemplos').addEventListener('change', function( e ) {
        fillCode( e.target.value )
    });
    document.getElementById('rodar').addEventListener('click', function() {
        var texto1 = document.getElementById('campo').value;
        var texto2 = document.getElementById('texto').value;

        runFunc('rodar', [texto1, texto2.replace(new RegExp('\n', 'g'),'||')]);
    });
    document.getElementById('limpar').addEventListener('click', function(){ resetStepUi(true); });

    document.getElementById('campo').addEventListener('change', function( e ) {
        window.localStorage.setItem('currentTexto1', e.target.value);
    });
    document.getElementById('texto').addEventListener('change', function( e ) {
        window.localStorage.setItem('currentTexto2', e.target.value);
    });

    document.getElementById('xml').addEventListener('click', function( e ) {
        document.getElementById('xml_content').value = window.localStorage.getItem('currentBlocksXML');
        document.getElementById('modal_full').style.display = 'block';
    });
    document.getElementById('xml_fechar').addEventListener('click', function( e ) {
        document.getElementById('modal_full').style.display = 'none';
    });
    document.getElementById('xml_trocar').addEventListener('click', function( e ) {
        if( confirm('Ter certeza? Você irá perder os blocos atuais!') ) {
            building = true;

            Code.workspacePlayground.clear();

            var xml = Blockly.Xml.textToDom(document.getElementById('xml_content').value);
            Blockly.Xml.domToWorkspace(xml, Code.workspacePlayground);

            setTimeout( function(){
                building = false;
                UpdateCode();
            }, 1000);
            
            document.getElementById('modal_full').style.display = 'none';
        }
    });
}

function UpdateCode(event) {
    var xml = Blockly.Xml.workspaceToDom(Code.workspacePlayground);

    window.localStorage.setItem('currentBlocksXML', Blockly.Xml.domToText(xml));

    var code = Blockly.JavaScript.workspaceToCode(Code.workspacePlayground);

    var cleanCode = '';
    // remove highlight lines
    /*
    code.split('\n').map(function (line) {
        if (line.indexOf('highlightBlock') === -1)
            cleanCode += (line + '\n');
    });
    codeOutput.innerHTML = basicCodeText + cleanCode;
    */
    codeOutput.innerHTML = basicCodeText + code;

    initLights();

    generateCodeAndLoadIntoInterpreter();
}

function generateCodeAndLoadIntoInterpreter() {
    // Generate JavaScript code and parse it.
    // Blockly.JavaScript.STATEMENT_PREFIX = 'highlightBlock(%1);\n';
    // Blockly.JavaScript.addReservedWords('highlightBlock');
    latestCode = Blockly.JavaScript.workspaceToCode(Code.workspacePlayground);

    resetStepUi(true);

    if( !building ) runInit();
}

function resetStepUi(clearOutput) {
    // document.getElementById('campo').value = '';
    // document.getElementById('texto').value = '';

    if (clearOutput) {
       outputArea.value = 'SAÍDA:\n=================';
    }
}

function initApi(interpreter, scope) {
    // Add an API function for the alert() block, generated for "text_print" blocks.
    var wrapper = function (text) {
        text = text ? text.toString() : '';
        outputArea.value = outputArea.value + '\n' + text;
        outputArea.scrollTo(0, 1000000000);
    };
    interpreter.setProperty(scope, 'alert',
        interpreter.createNativeFunction(wrapper));

    // Add an API function for the prompt() block.
    var wrapper = function (text) {
        text = text ? text.toString() : '';
        return interpreter.createPrimitive(prompt(text));
    };
    interpreter.setProperty(scope, 'prompt',
        interpreter.createNativeFunction(wrapper));

    // Add an API for the wait block.  See wait_block.js
    initInterpreterWaitForSeconds(interpreter, scope);

    // TODO:
    initInterpreterSetLight(interpreter, scope);

    // Add an API function for highlighting blocks.
    /*
    var wrapper = function (id) {
        id = id ? id.toString() : '';
        return interpreter.createPrimitive(highlightBlock(id));
    };
    interpreter.setProperty(scope, 'highlightBlock',
        interpreter.createNativeFunction(wrapper));
    */
}


/*
function highlightBlock(id) {
    Code.workspacePlayground.highlightBlock(id);
    highlightPause = true;
}
*/
function runInit() {
    console.log( 'INICIAR' );

    // Begin execution
    myInterpreter = new Interpreter('', initApi);    
    myInterpreter.appendCode(latestCode + 'if( iniciar ) iniciar()');

    var runner = function () {
        if (myInterpreter) {
            var hasMore = myInterpreter.run();
            if (hasMore) {
                // Execution is currently blocked by some async call.
                // Try again later.
                setTimeout(runner, 10);
            } else {
                // Program is complete.
                outputArea.value += '\n\n<< Inicialização completa >>';
            }
        }
    };
    runner();
}

function runFunc( code, args = [] ) {
    var arguments = [];
    if( args != [] ) {
        arguments = args.map( function( arg ) { return "\'" + arg + "\'"  });
    }

    var fullCode = 'if( typeof ' + code + ' == "function" ) ' + code + '(' + arguments.join(',') + ')';
    // console.log( fullCode );
    
    // Begin execution
    // highlightPause = false;
    var interpreter = new Interpreter('', initApi);
    interpreter.stateStack[0].scope = myInterpreter.stateStack[0].scope;
    interpreter.appendCode( fullCode );

    var runner = function () {
        if (interpreter) {
            try {                
                var hasMore = interpreter.run();

                if (hasMore) {
                    // Execution is currently blocked by some async call.
                    // Try again later.
                    setTimeout(runner, 10);
                } else {
                    // Program is complete.
                    // outputArea.value += '\n\n<< Programa completo >>';
                    // resetInterpreter();
                    // resetStepUi(false);
                }
            } catch( err ) {
                console.log( 'ERRO', err);
                outputArea.value += '\n\n<<< ERRO: ' + err.message + ' >>>';
            }             
        }
    };
    runner();
}

function initSVG() {
    var draw = SVG('controles').size( 565, 96 );

    var ajax = new XMLHttpRequest()
    ajax.open('GET', './controles_v1.svg', true)
    ajax.onload = function(e) {
        draw.svg(ajax.responseText)
        initLights();
        initButtons();
    }
    ajax.send()    
}

function initLights() {
    for(var i=1; i<=4; i++) {
        setLight( i, false );
    }
}
function initButtons() {
    for(var i=1; i<=4; i++) {
        setButton( i, false );
        bindButtonEvents( i );
    }
}

function bindButtonEvents( num ) {
    var botParent = SVG.get('bot' + num);

    var botOn = SVG.get('bot' + num + '_up');
    var botOff = SVG.get('bot' + num + '_down');

    botParent.mousedown( function() {
        botOn.hide();
        botOff.show();
    });
    botParent.mouseup( function() {
        botOn.show();
        botOff.hide();
        runFunc( 'botao'+num )
    });
}

function setLight( num, isOn ) {
    var luzOn = SVG.get('luz' + num + '_on');
    var luzOff = SVG.get('luz' + num + '_off');

    if( isOn ) {
        luzOn.show();
        luzOff.hide();
    } else {
        luzOn.hide();
        luzOff.show();
    }
}

function setButton( num, isDown ) {
    var botOn = SVG.get('bot' + num + '_up');
    var botOff = SVG.get('bot' + num + '_down');

    if( isDown ) {        
        botOn.hide();
        botOff.show();
    } else {
        botOn.show();
        botOff.hide();
    }
}

function fillCode( qual ){
    building = true;
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="controls_repeat_ext" id=",zqx_71CpEV%[m2gn;nC"><value name="TIMES"><shadow type="math_number" id="/vLQV;5avIw9MfKKgq)e"><field name="NUM">4</field></shadow><block type="variables_get" id="ZcGn`6rXr(-wc2K1PI-#"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><statement name="DO"><block type="eng_lamp" id="=o0e|?yp`F9g7iBZf?y-"><field name="estado">ON</field><next><block type="wait_seconds" id="Z.CV#][4~zvNd5^WP7M}"><field name="SECONDS">1</field><next><block type="eng_lamp" id="h:0mp;p(1*5vF_yyLv@/"><field name="estado">OFF</field><next><block type="wait_seconds" id=",vfg~8Qd%6Y),6G0.iU["><field name="SECONDS">1</field></block></next></block></next></block></next></block></statement></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="630" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="0c%%wS4}(;qTuFIW67;b"><value name="TIMES"><shadow type="math_number" id="pYmME9R}-k?Biy9n8,vV"><field name="NUM">2</field></shadow><block type="variables_get" id="a^(m,rN}8p*$1hG[xd#k"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><statement name="DO"><block type="wait_seconds" id="F7zW+z4FqLHG!.^vo7G@"><field name="SECONDS">1</field><next><block type="text_print" id="8j~O5MJ%CU(xux)3x-)m"><value name="TEXT"><shadow type="text" id="[tjy-Z7m)K0{d(ByJPrU"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="aU%_[?HSkifAr/uSz8g="><field name="SECONDS">1</field><next><block type="text_print" id="iijViKdkGZ77HsG^W?9?"><value name="TEXT"><shadow type="text" id="{B.nK3:qP^csN+[JD,g["><field name="TEXT">123</field></shadow></value></block></next></block></next></block></next></block></statement></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="330" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="=vW8l|m6?4oKD@T}D[}k"><value name="TEXT"><shadow type="text" id="4!E,UWk:aOk#Su*xs@Xj"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">5</field><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">2</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="FC3wU^=8EA/y]VnmwDS9"><value name="TIMES"><shadow type="math_number" id="8TKw1XDbLKl/hgIp2wet"><field name="NUM">10</field></shadow></value><statement name="DO"><block type="eng_lamp" id="Xz3E+^5}k]]lH(PoreX$"><field name="estado">ON</field><next><block type="wait_seconds" id=";Xp,{9]X;C!a50kRcTC/"><field name="SECONDS">1</field><next><block type="eng_lamp" id="GD5(iiRsK8pZ_t-=f~!V"><field name="estado">OFF</field><next><block type="wait_seconds" id="be(bAI[a=m+8,f{|u1Me"><field name="SECONDS">1</field></block></next></block></next></block></next></block></statement><next><block type="text_print" id=",Rptu[Z^JWBcKcyamE:g"><value name="TEXT"><shadow type="text" id="7khF`EvJ5Krh~:QRTA)w"><field name="TEXT">OK func1</field></shadow></value></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="490" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_repeat_ext" id="G5-1!B9NLw/Lzwz_(T=i"><value name="TIMES"><shadow type="math_number" id="$^$n5KwmQ(|2$d9sW_%|"><field name="NUM">10</field></shadow></value><statement name="DO"><block type="text_print" id="=vW8l|m6?4oKD@T}D[}k"><value name="TEXT"><shadow type="text" id="4!E,UWk:aOk#Su*xs@Xj"><field name="TEXT">abc</field></shadow></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">1</field></block></next></block></statement><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="{Ml*,$:zddhj+.wbA9r]" x="30" y="170"><field name="NAME">func1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="C_ArPob4=cCIPO~:7D1N" x="330" y="210"><field name="NAME">func2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="|o*RB-TCtv/3Ad3ajVDc"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="v{!.(=5S29*a08cMDlNp"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="^xE0w1+erWdXT~i4*f$,"><field name="SECONDS">5</field><next><block type="variables_set" id="drl@s,r8/5e6}h`)g7s_"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bN)!Y=1_(I+Ob#?T]#E]"><field name="NUM">321</field></block></value><next><block type="text_print" id="ZWl0tM4ksa}u{b{th3*`"><value name="TEXT"><shadow type="text" id="p^wM1vRhk5d7gE+UsKT*"><field name="TEXT">OK func2</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="event_block" id="xR8)gSL{;Cm5Lw^5FM4M" x="130" y="210"><statement name="NAME"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block></xml>';
    // var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="fveHmV($M%3sn;j])7YC">iteracoes</variable></variables><block type="procedures_defnoreturn" id="[u0wKnV9EJv6tk9-7]9r" x="270" y="70"><field name="NAME">init</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="Uq,?Qk|@5:r5a%_z%LSs"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field><value name="VALUE"><block type="math_number" id="bkZhPTo5Fm2=wy})0u+#"><field name="NUM">123</field></block></value><next><block type="text_print" id="N7i.5h];#[6rH:aMB7(C"><value name="TEXT"><shadow type="text" id="LW7ZbL,}ZcgH}pygR.QM"><field name="TEXT">definido para</field></shadow></value><next><block type="text_print" id="$|Vy@qB8zk`;VQlDv^TL"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id=":E,)ZGFOwJ8ptpdml#5-"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value></block></next></block></next></block></statement></block><block type="event_block" id="xR8)gSL{;Cm5Lw^5FM4M" x="130" y="210"><statement name="NAME"><block type="text_print" id="R}EE+hctMPW/G(ws:8kS"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="uv~kbfU`wJ!5#E,||R|3"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="wait_seconds" id="a=xg#[cz18c(|)j/KoM9"><field name="SECONDS">10</field><next><block type="text_print" id="Z?e},xRJ:gQOGhdW-+e]"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">definido para</field></shadow><block type="variables_get" id="B[o_Me7,xU%A_L/RI]xL"><field name="VAR" id="fveHmV($M%3sn;j])7YC" variabletype="">iteracoes</field></block></value><next><block type="text_print" id="EH8.]WJ8h-^~Ac%Cw=.7"><value name="TEXT"><shadow type="text" id="cF+:%1a@j,)Hy+#T5J/o"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></next></block></statement></block><block type="event_block" id="I,zJ$T|oM`9}l`=PZDAB" x="470" y="210"><statement name="NAME"><block type="text_print" id="SWwwZor|D;q?eDG:h#[U"><value name="TEXT"><shadow type="text" id="JrYZp5OIEo!zwtdU[s{D"><field name="TEXT">OK func1</field></shadow></value><next><block type="wait_seconds" id="FcURZrY1(c|aqQ2QgGsP"><field name="SECONDS">10</field><next><block type="text_print" id="PtKc{=nx4h*ku5#[}]0I"><value name="TEXT"><shadow type="text" id="xW)i[t0hR9F[;;@){ZHo"><field name="TEXT">OK func1</field></shadow></value></block></next></block></next></block></statement></block></xml>';
    
    var texto1 = window.localStorage.getItem('currentTexto1') || '';
    var texto2 = window.localStorage.getItem('currentTexto2') || '';;
    switch( qual ) {
        case 'eventos':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="j@Mm=rLq|zbWR?b+5{0R">var1</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="-190"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="9jJ[c)C?58w}_O[3,(Yj"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_number" id="u4Bj3O1Ufka7?e3`$NDw"><field name="NUM">2</field></block></value></block></statement></block><block type="procedures_defnoreturn" id=":5z$*!r1BaV%1WW2V3T+" x="10" y="-90"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="Xyv-vG(1R$Lk;qqK*aBy"><value name="TEXT"><shadow type="text" id="ipEckyEut?1K%Qi,~_6Z"><field name="TEXT">abc</field></shadow><block type="math_arithmetic" id="k=MK+dQcnE.?Y.|0Ynt5"><field name="OP">ADD</field><value name="A"><shadow type="math_number" id="Z(d9^3OMdZy`Hhr!9dV,"><field name="NUM">1</field></shadow><block type="variables_get" id="!oCIl$8^LyKpaHM*EPJ9"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="$QR#CkOb%TLN/FeCbBHm"><field name="NUM">1</field></shadow></value></block></value></block></statement></block><block type="procedures_defnoreturn" id="Rn78.OC_x]s*0})[AT?+" x="10" y="70"><field name="NAME">botao2</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="zA[!X?.KTcpk=aUB=gj+"><value name="TEXT"><shadow type="text" id="}Col_2vL*P;lN/hQ6nLW"><field name="TEXT">abc</field></shadow><block type="math_arithmetic" id="Ye@?w{72w;(/|GkgR9mB"><field name="OP">MULTIPLY</field><value name="A"><shadow type="math_number" id="Z(d9^3OMdZy`Hhr!9dV,"><field name="NUM">1</field></shadow><block type="variables_get" id="5++UJ`JsG1vqJk`]^.(:"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="`WBLI-nj88?2S;rH6Zij"><field name="NUM">2</field></shadow></value></block></value></block></statement></block></xml>';
            break;

        case 'eventos-result1':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="j@Mm=rLq|zbWR?b+5{0R">var1</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="-190"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="9jJ[c)C?58w}_O[3,(Yj"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_number" id="u4Bj3O1Ufka7?e3`$NDw"><field name="NUM">1</field></block></value></block></statement></block><block type="procedures_defnoreturn" id=":5z$*!r1BaV%1WW2V3T+" x="10" y="-90"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="UdN`l][qC{Y:!7]sH|b`"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_arithmetic" id="(nF?@Nb~q78F$!|~!VwY"><field name="OP">ADD</field><value name="A"><shadow type="math_number" id="voU~VSUS42oo;?D!,OM*"><field name="NUM">1</field></shadow><block type="variables_get" id="pY.!~$.bG!ZWhG}-G8MP"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="zrQ(#NBp0j!Z:7]_(ujD"><field name="NUM">1</field></shadow></value></block></value><next><block type="text_print" id="Xyv-vG(1R$Lk;qqK*aBy"><value name="TEXT"><shadow type="text" id="}Col_2vL*P;lN/hQ6nLW"><field name="TEXT">abc</field></shadow><block type="variables_get" id="r~G9ynQ44u`F/]5FAN)="><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value></block></next></block></statement></block><block type="procedures_defnoreturn" id="Rn78.OC_x]s*0})[AT?+" x="10" y="70"><field name="NAME">botao2</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="2x~C~]AX-uZ[awmUV/-H"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field><value name="VALUE"><block type="math_arithmetic" id="Y+EqGm;e)$gIILg#w^X["><field name="OP">MULTIPLY</field><value name="A"><shadow type="math_number" id="voU~VSUS42oo;?D!,OM*"><field name="NUM">1</field></shadow><block type="variables_get" id="DXtv09R?DkLgI,5I~H-f"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value><value name="B"><shadow type="math_number" id="a?8sKa:u-KR{d3*O#g@J"><field name="NUM">2</field></shadow></value></block></value><next><block type="text_print" id="zA[!X?.KTcpk=aUB=gj+"><value name="TEXT"><shadow type="text" id="}Col_2vL*P;lN/hQ6nLW"><field name="TEXT">abc</field></shadow><block type="variables_get" id="O{7`nwJP(,dM]fZH^{HA"><field name="VAR" id="j@Mm=rLq|zbWR?b+5{0R" variabletype="">var1</field></block></value></block></next></block></statement></block></xml>';
            break;
            
        case 'lampada':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="um{yv$6hPM_CzWh=!:Sh">acessa</variable><variable type="" id="gydlVOnq6TP/zJojclM4">acessa2</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="-130"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value><next><block type="variables_set" id="^HErhAEC?LLY^TzB$Dq9"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="!M+~tEp~5*HqzBwrU$lM"><field name="NUM">0</field></block></value><next><block type="variables_set" id="w:yq(Ou~]_RuAmww*RIh"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="P6kGQhLwl_p!rdU1U]T;"><field name="NUM">0</field></block></value></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="fGU~-F^r-c0eh9V@OT!J" x="330" y="-110"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_if" id="Q+j%Y=WKW4aP-!J}v0#m"><mutation else="1"></mutation><value name="IF0"><block type="logic_compare" id="]:)u,M@)Xd]5L0m|nrzP"><field name="OP">EQ</field><value name="A"><block type="variables_get" id="D,oSymjwM,~0d9n=XqTo"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field></block></value><value name="B"><block type="math_number" id="w^Evm$gDaU=o-uLMMX:*"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="eng_lamp" id="2N8%J{AO[DBR]kgB6%8U"><field name="num">1</field><field name="estado">ON</field><next><block type="variables_set" id="2t$ds,~=3p(|A[eg/WLP"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="y:wY%_Z)j6yuyNgtEAp9"><field name="NUM">1</field></block></value></block></next></block></statement><statement name="ELSE"><block type="eng_lamp" id="0a_;A@zGu7pv[y2bqGK*"><field name="num">1</field><field name="estado">OFF</field><next><block type="variables_set" id="l7MM](.%h5c.nGWB6jy%"><field name="VAR" id="um{yv$6hPM_CzWh=!:Sh" variabletype="">acessa</field><value name="VALUE"><block type="math_number" id="ZpSSQzy?UWP=w%LQtJ:M"><field name="NUM">0</field></block></value></block></next></block></statement></block></statement></block><block type="procedures_defnoreturn" id=")*3rAc_7*80+/MX__D9K" x="330" y="170"><field name="NAME">botao2</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_if" id="=.zMgup)Z.wqnN2QogIc"><mutation else="1"></mutation><value name="IF0"><block type="logic_compare" id="HjAH`qQ}VEfbgy?{bYyX"><field name="OP">EQ</field><value name="A"><block type="variables_get" id="]MjP8sHp;a$k/kRP9hh1"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field></block></value><value name="B"><block type="math_number" id="(+:?^+DBBuxT0VCvtW=:"><field name="NUM">0</field></block></value></block></value><statement name="DO0"><block type="eng_lamp" id="x?hXoX:/TVj?A18rY][i"><field name="num">2</field><field name="estado">ON</field><next><block type="variables_set" id="ABYN$wON$:OMCF5ckC58"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="Jo$_$P#NV,p{U4w8(hj!"><field name="NUM">1</field></block></value></block></next></block></statement><statement name="ELSE"><block type="eng_lamp" id=")Z]L5vE)pHKB1ScoqB#@"><field name="num">2</field><field name="estado">OFF</field><next><block type="variables_set" id="+/n$/jA1aoibN00DI|H6"><field name="VAR" id="gydlVOnq6TP/zJojclM4" variabletype="">acessa2</field><value name="VALUE"><block type="math_number" id="enF)Bu:Z2F2ZkB9`c@F+"><field name="NUM">0</field></block></value></block></next></block></statement></block></statement></block></xml>';
            break;

        case 'textos':
            texto1 = 'Primeiro texto';
            texto2 = 'Segundo texto';
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="#ogO6M?D?ean8H*7W3qT">texto1</variable><variable type="" id="mo_)^y;9]2gd:EXrMa!_">texto2</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-70"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block><block type="procedures_defnoreturn" id="[%1GwDjZimB/Ab]bK;0^" x="30" y="50"><mutation><arg name="texto1" varid="#ogO6M?D?ean8H*7W3qT"></arg><arg name="texto2" varid="mo_)^y;9]2gd:EXrMa!_"></arg></mutation><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="|$S;YYCyi=f%NovtIS_y"><value name="TEXT"><shadow type="text" id="k?$}E`A]I!~~Ny3`u1bF"><field name="TEXT">abc</field></shadow><block type="variables_get" id="FY#_XMHizDRZ[{#$N-|5"><field name="VAR" id="#ogO6M?D?ean8H*7W3qT" variabletype="">texto1</field></block></value><next><block type="text_print" id="j+Jz^:omB){el]y@Z!6."><value name="TEXT"><shadow type="text" id="k?$}E`A]I!~~Ny3`u1bF"><field name="TEXT">abc</field></shadow><block type="variables_get" id="pLz|AM(/#|;w3[7.PiP)"><field name="VAR" id="mo_)^y;9]2gd:EXrMa!_" variabletype="">texto2</field></block></value></block></next></block></statement></block></xml>';
            break;

        case 'listas':
            texto1 = 'https://docs.google.com/spreadsheets/d/1KlyRTmDDroCm8kkNkwY_Av4E8ZIkVmygX0fTrp_7_8A/edit?usp=sharing';
            texto2 = 'Ricardo,43\nCauê,8\nLuciane,42\nCamila,3\nMauricio,70\nAdilson,80';
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="#ogO6M?D?ean8H*7W3qT">texto1</variable><variable type="" id="mo_)^y;9]2gd:EXrMa!_">texto2</variable><variable type="" id="~T1pY@qU`$z^g8~ljGV}">linha</variable><variable type="" id="ZJtb.m8[R78rrt^T[Ik-">coluna</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-90"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block><block type="procedures_defnoreturn" id="[%1GwDjZimB/Ab]bK;0^" x="30" y="10"><mutation><arg name="texto1" varid="#ogO6M?D?ean8H*7W3qT"></arg><arg name="texto2" varid="mo_)^y;9]2gd:EXrMa!_"></arg></mutation><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="controls_forEach" id="Q5%43(jf*p!VjWzR]=px"><field name="VAR" id="~T1pY@qU`$z^g8~ljGV}" variabletype="">linha</field><value name="LIST"><block type="lists_split" id="A}RCfw423B0tyb8,])t@"><mutation mode="SPLIT"></mutation><field name="MODE">SPLIT</field><value name="INPUT"><block type="variables_get" id="$O.tNo+0XPf9_aL`aOf8"><field name="VAR" id="mo_)^y;9]2gd:EXrMa!_" variabletype="">texto2</field></block></value><value name="DELIM"><shadow type="text" id="Z5YJ9o=aJ}P.sSLB4D_3"><field name="TEXT">||</field></shadow></value></block></value><statement name="DO"><block type="variables_set" id="Y${I]3yDu~Um?s/n5^dW"><field name="VAR" id="ZJtb.m8[R78rrt^T[Ik-" variabletype="">coluna</field><value name="VALUE"><block type="lists_split" id="b9_TSWv!uKAr]1jGJ$/d"><mutation mode="SPLIT"></mutation><field name="MODE">SPLIT</field><value name="INPUT"><block type="variables_get" id=",_H*UK9OOs}XF?LA`j9V"><field name="VAR" id="~T1pY@qU`$z^g8~ljGV}" variabletype="">linha</field></block></value><value name="DELIM"><shadow type="text" id="@Jz/P(:nc?T(f1xmBl}a"><field name="TEXT">,</field></shadow></value></block></value><next><block type="text_print" id="+EB76=NFMAZoHB0W004}"><value name="TEXT"><shadow type="text" id="WzR/GwWh6eG_=9Dkt/NB"><field name="TEXT">abc</field></shadow><block type="text_join" id="z@N[f{KkSg+;{+`X^e+5"><mutation items="5"></mutation><value name="ADD0"><block type="text" id="V`x}xh?pz`)Dw,7r}5OA"><field name="TEXT">Nome:</field></block></value><value name="ADD1"><block type="lists_getIndex" id="/3zq?a%6t#VudI7!{u32"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="pH0r:r?7+hx4*Sie3!ED"><field name="VAR" id="ZJtb.m8[R78rrt^T[Ik-" variabletype="">coluna</field></block></value><value name="AT"><block type="math_number" id="4|AnZ/8W43|cx-AaQ]}B"><field name="NUM">1</field></block></value></block></value><value name="ADD2"><block type="text" id="%@deazPWAH?90IA9)GNb"><field name="TEXT">,Idade:</field></block></value><value name="ADD3"><block type="lists_getIndex" id="iqJ(_kgHfx!7y?/.]v4#"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="Wzkz2T%9Md_n.99M}_J_"><field name="VAR" id="ZJtb.m8[R78rrt^T[Ik-" variabletype="">coluna</field></block></value><value name="AT"><block type="math_number" id="oBr-@$E]zIUxx43jNu6u"><field name="NUM">2</field></block></value></block></value><value name="ADD4"><block type="logic_ternary" id="yj3Hfp8MhWv(}3Wk.u`H"><value name="IF"><block type="logic_compare" id="GOkP8!W,FsJVzq|X0CmG"><field name="OP">GTE</field><value name="A"><block type="lists_getIndex" id="+HT}@kl+Q]%r}rsWA!=~"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="!Q-X]XF)-S?c]hctd6S)"><field name="VAR" id="ZJtb.m8[R78rrt^T[Ik-" variabletype="">coluna</field></block></value><value name="AT"><block type="math_number" id="Sx}}^~fy;0_9x7n?]b5#"><field name="NUM">2</field></block></value></block></value><value name="B"><block type="math_number" id="?t~#Xn%lu.N3DMWi|k3%"><field name="NUM">18</field></block></value></block></value><value name="THEN"><block type="text" id="P:W:lsl.G`rPN/?bZ.s9"><field name="TEXT">(Maior)</field></block></value><value name="ELSE"><block type="text" id="T9/BYQ;vR){FT8i4*_/x"><field name="TEXT">(Menor)</field></block></value></block></value></block></value></block></next></block></statement></block></statement></block></xml>';
            break;

        case 'decisao':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="0E7F#^5W`^!lxxcpTXYS">valor</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-110"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow></value></block></statement></block><block type="procedures_defnoreturn" id="eJTUGj[kMVny7ybs.EtR" x="30" y="-10"><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="g4aj8b(sl5U*DLx^Ub1C"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field><value name="VALUE"><block type="math_random_int" id="hE,}M5B1=n]gum[vwC$r"><value name="FROM"><shadow type="math_number" id="~R(5gHf;730):F,b7M`%"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number" id="P4~mcM1`y[!+=iK~uzak"><field name="NUM">100</field></shadow></value></block></value></block></statement></block></xml>';
            break;

        case 'decisao-result1':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="0E7F#^5W`^!lxxcpTXYS">valor</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-110"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow></value></block></statement></block><block type="procedures_defnoreturn" id="eJTUGj[kMVny7ybs.EtR" x="30" y="-10"><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="g4aj8b(sl5U*DLx^Ub1C"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field><value name="VALUE"><block type="math_random_int" id="hE,}M5B1=n]gum[vwC$r"><value name="FROM"><shadow type="math_number" id="~R(5gHf;730):F,b7M`%"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number" id="P4~mcM1`y[!+=iK~uzak"><field name="NUM">100</field></shadow></value></block></value><next><block type="controls_if" id="htcbuZ8(3jk|Gj3AaAlN"><mutation else="1"></mutation><value name="IF0"><block type="math_number_property" id="aZ$=:l0e8yyLljr2k2fE"><mutation divisor_input="false"></mutation><field name="PROPERTY">EVEN</field><value name="NUMBER_TO_CHECK"><shadow type="math_number" id="Ld2nP6N?z#^~qwlIx^|x"><field name="NUM">0</field></shadow><block type="variables_get" id="$I:hrU^P-nirO[)v,aoY"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value></block></value><statement name="DO0"><block type="text_print" id="s1;g66MoNrD*:k^$JA5T"><value name="TEXT"><shadow type="text" id="RI[nJCl^QE-rU+fk]Of!"><field name="TEXT">é par</field></shadow><block type="text_join" id="Bw)#hZ[5Xv}P|2%S|DpW"><mutation items="2"></mutation><value name="ADD0"><block type="variables_get" id="aoGNOy.;OM)Jv*n;.|GI"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="ADD1"><block type="text" id="jmYmQz.mZ],I*hwrPTyv"><field name="TEXT"> É PAR</field></block></value></block></value></block></statement><statement name="ELSE"><block type="text_print" id="~MT61*[J9Yz~p3*.oQ*R"><value name="TEXT"><shadow type="text" id="RI[nJCl^QE-rU+fk]Of!"><field name="TEXT">é par</field></shadow><block type="text_join" id="`=+,xeHLW^awf*@MTm;h"><mutation items="2"></mutation><value name="ADD0"><block type="variables_get" id="!B7igE(z:x;L-su}l!2Z"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="ADD1"><block type="text" id="}rJSj/0%*q3m[$ef-eq8"><field name="TEXT"> É IMPAR</field></block></value></block></value></block></statement></block></next></block></statement></block></xml>';
            break;

        case 'decisao-result2':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="0E7F#^5W`^!lxxcpTXYS">valor</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-110"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow></value></block></statement></block><block type="procedures_defnoreturn" id="eJTUGj[kMVny7ybs.EtR" x="30" y="-10"><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="variables_set" id="g4aj8b(sl5U*DLx^Ub1C"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field><value name="VALUE"><block type="math_random_int" id="hE,}M5B1=n]gum[vwC$r"><value name="FROM"><shadow type="math_number" id="~R(5gHf;730):F,b7M`%"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number" id="P4~mcM1`y[!+=iK~uzak"><field name="NUM">100</field></shadow></value></block></value><next><block type="controls_if" id="htcbuZ8(3jk|Gj3AaAlN"><mutation elseif="1" else="1"></mutation><value name="IF0"><block type="logic_compare" id=",CkvTDOGaf#%|ud!:NZ^"><field name="OP">LTE</field><value name="A"><block type="variables_get" id="_HypSRTSjWzLx-8FL5E-"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="B"><block type="math_number" id="~N#X)BxrjP}I].k8)H`/"><field name="NUM">30</field></block></value></block></value><statement name="DO0"><block type="text_print" id="s1;g66MoNrD*:k^$JA5T"><value name="TEXT"><shadow type="text" id="RI[nJCl^QE-rU+fk]Of!"><field name="TEXT">é par</field></shadow><block type="text_join" id="Bw)#hZ[5Xv}P|2%S|DpW"><mutation items="2"></mutation><value name="ADD0"><block type="variables_get" id="aoGNOy.;OM)Jv*n;.|GI"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="ADD1"><block type="text" id="@KaQY,,dNAmeV=9qf*^@"><field name="TEXT"> É MENOR QUE 30</field></block></value></block></value></block></statement><value name="IF1"><block type="logic_operation" id="-)((J--u}esT?~Awai*f"><field name="OP">AND</field><value name="A"><block type="logic_compare" id="/Nb`j27$0jRr_~y8_5,]"><field name="OP">GT</field><value name="A"><block type="variables_get" id="Lem-(LK3KTpZDMS6Ze9+"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="B"><block type="math_number" id="7vbm:+9aAol.V4Ljn@;?"><field name="NUM">30</field></block></value></block></value><value name="B"><block type="logic_compare" id="KbasiS@lvMCl+nD=Gcoc"><field name="OP">LTE</field><value name="A"><block type="variables_get" id="zj3VM6_+OF%vL-7Rd~D;"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="B"><block type="math_number" id="lDL;lnp,^P^;]Y#5IeOV"><field name="NUM">60</field></block></value></block></value></block></value><statement name="DO1"><block type="text_print" id="xlaKr6HM*FltH$^w{Ul("><value name="TEXT"><shadow type="text" id="RI[nJCl^QE-rU+fk]Of!"><field name="TEXT">é par</field></shadow><block type="text_join" id="qesvMLXDG9!Gl@4PikIv"><mutation items="2"></mutation><value name="ADD0"><block type="variables_get" id="79?P@%:EcX;3%y2/|]qS"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="ADD1"><block type="text" id="fhJ8g)mh!Cd~_=B{Yl?`"><field name="TEXT"> É MAIOR QUE 30 MAS MENOR QUE 60</field></block></value></block></value></block></statement><statement name="ELSE"><block type="text_print" id="~MT61*[J9Yz~p3*.oQ*R"><value name="TEXT"><shadow type="text" id="RI[nJCl^QE-rU+fk]Of!"><field name="TEXT">é par</field></shadow><block type="text_join" id="`=+,xeHLW^awf*@MTm;h"><mutation items="2"></mutation><value name="ADD0"><block type="variables_get" id="!B7igE(z:x;L-su}l!2Z"><field name="VAR" id="0E7F#^5W`^!lxxcpTXYS" variabletype="">valor</field></block></value><value name="ADD1"><block type="text" id="%]SD+V_N$v8^w})aEhyy"><field name="TEXT"> É MAIOR QUE 60</field></block></value></block></value></block></statement></block></next></block></statement></block></xml>';
            break;

        case 'variaveis-result':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="Y2.xGoSe9!(O}ElS0l^6">nome</variable><variable type="" id="MzH^fotl~I2swk]!H4n!">idade</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-70"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="|_oGu2IAepwHHba]Lyvv"><field name="VAR" id="Y2.xGoSe9!(O}ElS0l^6" variabletype="">nome</field><value name="VALUE"><block type="text" id="Bk#Ocy$oX#a:UVSV#t*F"><field name="TEXT">José</field></block></value><next><block type="variables_set" id="Ng[Fr8}H*w?Tr}d{0|,_"><field name="VAR" id="MzH^fotl~I2swk]!H4n!" variabletype="">idade</field><value name="VALUE"><block type="math_number" id="vL-PQr6O1*OjH71smBI1"><field name="NUM">25</field></block></value><next><block type="text_print" id="Rz25n){}M|)#G[x#F20J"><value name="TEXT"><shadow type="text" id="f*Lx,VMOzQO1pyRixX2,"><field name="TEXT">abc</field></shadow><block type="text_join" id="0^EXAsoJHEBNm[-a|_{a"><mutation items="2"></mutation><value name="ADD0"><block type="text" id="q,_+_NOVlu9e~a+;IJXm"><field name="TEXT">Meu nome é </field></block></value><value name="ADD1"><block type="variables_get" id=":yFD$dA,.Y|r,%HJ[{mq"><field name="VAR" id="Y2.xGoSe9!(O}ElS0l^6" variabletype="">nome</field></block></value></block></value><next><block type="text_print" id="W[9Z{YYJdp0GNLfuK4_x"><value name="TEXT"><shadow type="text" id="8!Y;y)8U,w?^S}5ta_Sh"><field name="TEXT">abc</field></shadow><block type="text_join" id="oN/12[`ezC0^b4T~}os."><mutation items="2"></mutation><value name="ADD0"><block type="text" id="LB`C;b?CD,LC4#/BGzk("><field name="TEXT">Minha idade é </field></block></value><value name="ADD1"><block type="variables_get" id="`$6,d;c6TtfWP%_wFj,B"><field name="VAR" id="MzH^fotl~I2swk]!H4n!" variabletype="">idade</field></block></value></block></value><next><block type="text_print" id="y@OPG+L7oSXr7HP4H^2f"><value name="TEXT"><shadow type="text" id="8!Y;y)8U,w?^S}5ta_Sh"><field name="TEXT">abc</field></shadow><block type="text_join" id="X^/`^;jTgasP|}HIh:Yu"><mutation items="3"></mutation><value name="ADD0"><block type="text" id="cPBEa#@Yp,3lcd[]LB@H"><field name="TEXT">Meu nome tem </field></block></value><value name="ADD1"><block type="text_length" id="L~`rA^1}X,mZ#m?=pdp)"><value name="VALUE"><shadow type="text" id="pF(^qU3;DG)ix,.Yi]#m"><field name="TEXT">abc</field></shadow><block type="variables_get" id="tHU.Xj]YH~:Nomj@mAR!"><field name="VAR" id="Y2.xGoSe9!(O}ElS0l^6" variabletype="">nome</field></block></value></block></value><value name="ADD2"><block type="text" id="8|Xq%[Y}:LqPC|Q!-pkS"><field name="TEXT"> caracteres</field></block></value></block></value></block></next></block></next></block></next></block></next></block></statement></block></xml>';
            break;

        case 'variaveis':
            texto2 = 
`1 - Criar a variável 'nome'
2 - Criar a variável 'idade'
3 - Colocar o seu nome na variável 'nome' (Texto)
4 - Colocar a sua idade na variável 'idade' (Matemática)
//  Verifique o código Javascript
5 - Imprimir o valor da variável 'nome'
6 - Imprimir o valor da variável 'idade'
7 - Imprimir 'O meu nome é'
8 - Imprimir 'A minha idade é'
//  Utilizar o bloco 'Criar texto com'
//  Utilizar o bloco 'tamanho de'`;

            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-150"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block></xml>';
            break;

        case 'operadores':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-110"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="math_arithmetic" id="yn};h6:{$;|N[;{Hy{@B"><field name="OP">ADD</field><value name="A"><shadow type="math_number" id="x@MZIx*ohL`3.08S}bz_"><field name="NUM">1</field></shadow></value><value name="B"><shadow type="math_number" id="TZ,*%4^%$jDeZ?I:F:j~"><field name="NUM">1</field></shadow></value></block></value><next><block type="text_print" id="Alb_L[9g[=S1{!O|XCx!"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="logic_compare" id="$w]!_uFyvhd`|Iu=}.]%"><field name="OP">EQ</field><value name="A"><block type="math_number" id=")RM|AXYLk!HX/qLF4RN["><field name="NUM">2</field></block></value><value name="B"><block type="math_number" id="H5c[qA;d-{W!f#M8yRHw"><field name="NUM">2</field></block></value></block></value><next><block type="text_print" id="]6Wt#efKK6]+zE-G2y[x"><value name="TEXT"><shadow type="text" id="0=V{[ZlCJVnL8cG:TyAW"><field name="TEXT">Inicio</field></shadow><block type="math_single" id="W2?aR9{7edRsDr=[S=s%"><field name="OP">ROOT</field><value name="NUM"><shadow type="math_number" id="I~X/l7+%h-O9h=#!y}!A"><field name="NUM">9</field></shadow></value></block></value><next><block type="text_print" id="7?p4z2Ksas*=g/s{buS}"><value name="TEXT"><shadow type="text" id="0=V{[ZlCJVnL8cG:TyAW"><field name="TEXT">Inicio</field></shadow><block type="logic_operation" id="uE~`/K/Q{2U4EvwI$RpX"><field name="OP">AND</field><value name="A"><block type="logic_boolean" id="52g)`UC@~U3M,*bp61jF"><field name="BOOL">TRUE</field></block></value><value name="B"><block type="logic_boolean" id="l]-Q:wD;)k/wq6vH9.b/"><field name="BOOL">FALSE</field></block></value></block></value></block></next></block></next></block></next></block></statement></block></xml>';
            break;

        case 'nibble_tabela':
            texto1 = 'A,B,C,D,E,F,G,H,I,J,K,L,M,N,O';
            var text = 
            '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="y[]Dx^6JiSZ:+u*krRz$">lista</variable><variable type="" id="s.{1B^NHNE7gu#nbOd,a">numero</variable><variable type="" id="BxRaxT8w]rL+/n0ZshLB">nibble</variable><variable type="" id="63yLDj.:m(+Irlw|qpnE">tabela</variable><variable type="" id="K!+9^-OtP?,dC%:BGX}t">divisao</variable><variable type="" id="=O_H}T.96IC*?E~D4_,2">resto</variable><variable type="" id="Q|noaf,3s+KRTZl,jZaH">i</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="150" y="10"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="[i]3}0mS0SQLanleF.N,"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field><value name="VALUE"><block type="math_number" id="OI.*i:r|0y+ESe.@hVL-"><field name="NUM">5</field></block></value><next><block type="variables_set" id="SBr.(fBbWc9|{FnfA_K5"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="VALUE"><block type="text" id="qDC;~.]IF_xs2?w;Y^/|"><field name="TEXT"></field></block></value><next><block type="variables_set" id="(xJGo-2j#I0(Q;fw3B1["><field name="VAR" id="K!+9^-OtP?,dC%:BGX}t" variabletype="">divisao</field><next><block type="text_append" id="T|MoqW)C(mismc8:D)n:"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="xde1C{,I(]4R-{0CWIO:"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="BJO6PQ.`Y4;kKHqwPREF"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="A=kY;%`JNXPeOw,l^dJ6"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value><value name="B"><shadow type="math_number" id="+%::Hk[@_W9jdn93I9eT"><field name="NUM">8</field></shadow></value></block></value></block></value><next><block type="variables_set" id="HfO|$;$zYV1n3bcVN.Vm"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="gKZEX83wb`or0gr#u@I2"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id="~w`A!.4ePCOsOZ[|1bQ["><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value><value name="DIVISOR"><shadow type="math_number" id="N[K9PzAQMC_sn7IxZ3I/"><field name="NUM">8</field></shadow></value></block></value><next><block type="text_append" id="UW2#pyBrf]cxpkJmH;X$"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="n!^s+n^!fV_uPC%ua3G9"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="jrrU]s}D8|5`6|XUL9yL"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="Np`lrpIa}Bq!,5]xy*-]"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="AYqn/xQ]9uRRPp*KI%Ix"><field name="NUM">4</field></shadow></value></block></value></block></value><next><block type="variables_set" id="^17QPey,*~cH`WSfel[c"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="za_MBRY?{M`,qA.%@7GC"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id="FYBLxK}o5rOtomWT@4b^"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="DIVISOR"><shadow type="math_number" id="k!#1Mx9ZdMM]Zz%|t4jr"><field name="NUM">4</field></shadow></value></block></value><next><block type="text_append" id="^/]e]^^l-,($Db1exSH]"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="j_,i_Klb;A-URL(n,Nx{"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="bytK(3.KYwRi3/%z.N3o"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="swAa(mkj{CnMdA)I|L=G"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="yDUSjCw]2(R2.}odx:XB"><field name="NUM">2</field></shadow></value></block></value></block></value><next><block type="variables_set" id="6nF*6EdE~KLXc1YH!^#k"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="%1(x]a2@+{u#2pD;3+y9"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id=")IPABRVUM@.uxc/scTXe"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="DIVISOR"><shadow type="math_number" id="[2OC4iUHH,{-.};O=O{["><field name="NUM">2</field></shadow></value></block></value><next><block type="text_append" id="?S`J3M%!Q!r47h5$|oML"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="!vrzQN]Jym@IrijT#`tO"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="eGMZ!2|Jxc*BJt)BM#=h"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="byO`,fRvOV-fcwPql(@9"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="R882F^8,RR$ICqT?~#RA"><field name="NUM">1</field></shadow></value></block></value></block></value><next><block type="text_print" id="WeO=eE^m_htB[X886Q%c"><value name="TEXT"><shadow type="text" id="XZjB{auG}-2v|q6*Mg4M"><field name="TEXT">abc</field></shadow><block type="variables_get" id="k7[?Q;_oo?pD]V0zzFEU"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field></block></value><next><block type="controls_for" id="nC6@3^$US[EC5`AHt8D7"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field><value name="FROM"><shadow type="math_number" id="Rn%O@^2R*MrAL3%]4JjO"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number" id="`C0MJ7n?2EMH9~]NJ0:0"><field name="NUM">4</field></shadow></value><value name="BY"><shadow type="math_number" id="-38MPD_$pmsDQce0zMT$"><field name="NUM">1</field></shadow></value><statement name="DO"><block type="eng_lamp2" id="@ElQtz`WP,k@~[ECL~l4"><value name="A"><block type="variables_get" id="Z4++A.)}KuZP:t-#ViH+"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field></block></value><value name="B"><block type="logic_compare" id="i/ojaow.T.JGDz#@-)?9"><field name="OP">EQ</field><value name="A"><block type="text_charAt" id="!bobI#NFagAIaJ-B^cip"><mutation at="true"></mutation><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="1biEx9qEbiH*qAK#+%e1"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field></block></value><value name="AT"><block type="variables_get" id="4z1l8h^%=cdjh`M+=Svg"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field></block></value></block></value><value name="B"><block type="text" id="NpGcM@]T#n.sTquiGgIk"><field name="TEXT">1</field></block></value></block></value></block></statement></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="b6L7/P36bh3Dt-iT0-Yd" x="150" y="550"><mutation><arg name="lista" varid="y[]Dx^6JiSZ:+u*krRz$"></arg></mutation><field name="NAME">rodar</field><comment pinned="false" h="80" w="160">Descreva esta função...</comment><statement name="STACK"><block type="text_print" id="Q,!6g_53o,,zbR6mi*M~"><value name="TEXT"><shadow type="text" id="$f]`McoI{8v]i~wiphXW"><field name="TEXT">abc</field></shadow><block type="variables_get" id="^}U6eR_Q#|u__DvMk]%L"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value><next><block type="variables_set" id="@:CXpw1uc?Wppv]1+N90"><field name="VAR" id="63yLDj.:m(+Irlw|qpnE" variabletype="">tabela</field><value name="VALUE"><block type="lists_split" id="%cMTcOlOjMJ6c*w{$2q/"><mutation mode="SPLIT"></mutation><field name="MODE">SPLIT</field><value name="INPUT"><block type="variables_get" id="_;Q950Xe%k-(Turk_ros"><field name="VAR" id="y[]Dx^6JiSZ:+u*krRz$" variabletype="">lista</field></block></value><value name="DELIM"><shadow type="text" id="#}v_M3BN3Dr}q^lEv5Mx"><field name="TEXT">,</field></shadow></value></block></value><next><block type="text_print" id="zuTH0Wd-2TO$f6zO4vZe"><value name="TEXT"><shadow type="text" id="$f]`McoI{8v]i~wiphXW"><field name="TEXT">abc</field></shadow><block type="lists_getIndex" id="B81*B+qcDVQkm?}OQ6uR"><mutation statement="false" at="true"></mutation><field name="MODE">GET</field><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="l.%^FA3L58U4T@{@ZfOV"><field name="VAR" id="63yLDj.:m(+Irlw|qpnE" variabletype="">tabela</field></block></value><value name="AT"><block type="variables_get" id="JYPCCi^Q)9GDtnuG`fKf"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value></block></value></block></next></block></next></block></statement></block></xml>';
            break;

        case 'nibble':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables><variable type="" id="s.{1B^NHNE7gu#nbOd,a">numero</variable><variable type="" id="BxRaxT8w]rL+/n0ZshLB">nibble</variable><variable type="" id="K!+9^-OtP?,dC%:BGX}t">divisao</variable><variable type="" id="=O_H}T.96IC*?E~D4_,2">resto</variable><variable type="" id="Q|noaf,3s+KRTZl,jZaH">i</variable></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="-230" y="-210"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="variables_set" id="[i]3}0mS0SQLanleF.N,"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field><value name="VALUE"><block type="math_number" id="OI.*i:r|0y+ESe.@hVL-"><field name="NUM">13</field></block></value><next><block type="variables_set" id="SBr.(fBbWc9|{FnfA_K5"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="VALUE"><block type="text" id="qDC;~.]IF_xs2?w;Y^/|"><field name="TEXT"></field></block></value><next><block type="variables_set" id="(xJGo-2j#I0(Q;fw3B1["><field name="VAR" id="K!+9^-OtP?,dC%:BGX}t" variabletype="">divisao</field><next><block type="text_append" id="T|MoqW)C(mismc8:D)n:"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="xde1C{,I(]4R-{0CWIO:"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="BJO6PQ.`Y4;kKHqwPREF"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="A=kY;%`JNXPeOw,l^dJ6"><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value><value name="B"><shadow type="math_number" id="+%::Hk[@_W9jdn93I9eT"><field name="NUM">8</field></shadow></value></block></value></block></value><next><block type="variables_set" id="HfO|$;$zYV1n3bcVN.Vm"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="gKZEX83wb`or0gr#u@I2"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id="~w`A!.4ePCOsOZ[|1bQ["><field name="VAR" id="s.{1B^NHNE7gu#nbOd,a" variabletype="">numero</field></block></value><value name="DIVISOR"><shadow type="math_number" id="N[K9PzAQMC_sn7IxZ3I/"><field name="NUM">8</field></shadow></value></block></value><next><block type="text_append" id="UW2#pyBrf]cxpkJmH;X$"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="n!^s+n^!fV_uPC%ua3G9"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="jrrU]s}D8|5`6|XUL9yL"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="Np`lrpIa}Bq!,5]xy*-]"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="AYqn/xQ]9uRRPp*KI%Ix"><field name="NUM">4</field></shadow></value></block></value></block></value><next><block type="variables_set" id="^17QPey,*~cH`WSfel[c"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="za_MBRY?{M`,qA.%@7GC"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id="FYBLxK}o5rOtomWT@4b^"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="DIVISOR"><shadow type="math_number" id="k!#1Mx9ZdMM]Zz%|t4jr"><field name="NUM">4</field></shadow></value></block></value><next><block type="text_append" id="^/]e]^^l-,($Db1exSH]"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="j_,i_Klb;A-URL(n,Nx{"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="bytK(3.KYwRi3/%z.N3o"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="swAa(mkj{CnMdA)I|L=G"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="yDUSjCw]2(R2.}odx:XB"><field name="NUM">2</field></shadow></value></block></value></block></value><next><block type="variables_set" id="6nF*6EdE~KLXc1YH!^#k"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field><value name="VALUE"><block type="math_modulo" id="%1(x]a2@+{u#2pD;3+y9"><value name="DIVIDEND"><shadow type="math_number" id="B@3zzq5V3pab,Uq^pY]S"><field name="NUM">64</field></shadow><block type="variables_get" id=")IPABRVUM@.uxc/scTXe"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="DIVISOR"><shadow type="math_number" id="[2OC4iUHH,{-.};O=O{["><field name="NUM">2</field></shadow></value></block></value><next><block type="text_append" id="?S`J3M%!Q!r47h5$|oML"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field><value name="TEXT"><shadow type="text" id="{E08A{q;$DDk0!}XT{Cq"><field name="TEXT"></field></shadow><block type="math_round" id="!vrzQN]Jym@IrijT#`tO"><field name="OP">ROUNDDOWN</field><value name="NUM"><shadow type="math_number" id="if%f.qEV:@|`3GEef7~,"><field name="NUM">3.1</field></shadow><block type="math_arithmetic" id="eGMZ!2|Jxc*BJt)BM#=h"><field name="OP">DIVIDE</field><value name="A"><shadow type="math_number" id=",avnXu/q.]9A)LT!VCCQ"><field name="NUM">1</field></shadow><block type="variables_get" id="byO`,fRvOV-fcwPql(@9"><field name="VAR" id="=O_H}T.96IC*?E~D4_,2" variabletype="">resto</field></block></value><value name="B"><shadow type="math_number" id="R882F^8,RR$ICqT?~#RA"><field name="NUM">1</field></shadow></value></block></value></block></value><next><block type="text_print" id="WeO=eE^m_htB[X886Q%c"><value name="TEXT"><shadow type="text" id="XZjB{auG}-2v|q6*Mg4M"><field name="TEXT">abc</field></shadow><block type="variables_get" id="k7[?Q;_oo?pD]V0zzFEU"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field></block></value><next><block type="controls_for" id="nC6@3^$US[EC5`AHt8D7"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field><value name="FROM"><shadow type="math_number" id="Rn%O@^2R*MrAL3%]4JjO"><field name="NUM">1</field></shadow></value><value name="TO"><shadow type="math_number" id="`C0MJ7n?2EMH9~]NJ0:0"><field name="NUM">4</field></shadow></value><value name="BY"><shadow type="math_number" id="-38MPD_$pmsDQce0zMT$"><field name="NUM">1</field></shadow></value><statement name="DO"><block type="eng_lamp2" id="@ElQtz`WP,k@~[ECL~l4"><value name="A"><block type="variables_get" id="Z4++A.)}KuZP:t-#ViH+"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field></block></value><value name="B"><block type="logic_compare" id="i/ojaow.T.JGDz#@-)?9"><field name="OP">EQ</field><value name="A"><block type="text_charAt" id="!bobI#NFagAIaJ-B^cip"><mutation at="true"></mutation><field name="WHERE">FROM_START</field><value name="VALUE"><block type="variables_get" id="1biEx9qEbiH*qAK#+%e1"><field name="VAR" id="BxRaxT8w]rL+/n0ZshLB" variabletype="">nibble</field></block></value><value name="AT"><block type="variables_get" id="4z1l8h^%=cdjh`M+=Svg"><field name="VAR" id="Q|noaf,3s+KRTZl,jZaH" variabletype="">i</field></block></value></block></value><value name="B"><block type="text" id="NpGcM@]T#n.sTquiGgIk"><field name="TEXT">1</field></block></value></block></value></block></statement></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block></xml>';
            break;  

        case 'tipos':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id=":5z$*!r1BaV%1WW2V3T+" x="30" y="30"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="~I_0zIH-4$8ihr2=wSwl"><value name="TEXT"><shadow type="text" id="e2#-qGxw$;;l.Tkvkj/x"><field name="TEXT">abc</field></shadow><block type="text" id="3}f]H*P/-+JX%HbZ@WjG"><field name="TEXT">ALOHA</field></block></value><next><block type="text_print" id="7l7-Q]3I5hHBYm];7R3G"><value name="TEXT"><shadow type="text" id="xm=?.=zv#;Jl[iDh(Bnp"><field name="TEXT">abc</field></shadow><block type="math_number" id="k5k)i1zApRZf^k~D2[9c"><field name="NUM">123</field></block></value><next><block type="text_print" id="#3uc/(,vN|R|sj*W~;V;"><value name="TEXT"><shadow type="text" id="xm=?.=zv#;Jl[iDh(Bnp"><field name="TEXT">abc</field></shadow><block type="math_arithmetic" id="=RXDJ8A=xp}8?4@n{opZ"><field name="OP">MULTIPLY</field><value name="A"><shadow type="math_number" id="9]JrO?8GOj0z7KIBoZTT"><field name="NUM">1</field></shadow><block type="math_number" id="$=U--nqm|{g`ENpbVlTQ"><field name="NUM">2</field></block></value><value name="B"><shadow type="math_number" id="e(uPF};NguW_}v8.j3iU"><field name="NUM">1</field></shadow><block type="math_number" id="+d!W!e[%~M[/Wptp`7JT"><field name="NUM">2</field></block></value></block></value><next><block type="text_print" id="#O6Wfj)LM:(yNgcs#}Z%"><value name="TEXT"><shadow type="text" id="xm=?.=zv#;Jl[iDh(Bnp"><field name="TEXT">abc</field></shadow><block type="text_join" id="Dr[K;=@/.*nqePf;wx+K"><mutation items="2"></mutation><value name="ADD0"><block type="text" id="7=z?;Ua5d!ATf9pEG;Nl"><field name="TEXT">Ola</field></block></value><value name="ADD1"><block type="text" id="kVVXUm4B^(=b5b2t6GB4"><field name="TEXT">Desenvolvedor</field></block></value></block></value><next><block type="text_print" id=".7CY(!}hFQJeCkwLy5BQ"><value name="TEXT"><shadow type="text" id="T?}JM66qN^w|vvvfRg9K"><field name="TEXT">abc</field></shadow><block type="text_length" id="4/AxUh,Z?])K)AUqvNm*"><value name="VALUE"><shadow type="text" id="%kQEMI*3dl7Q!dypN?(D"><field name="TEXT">abc</field></shadow><block type="text" id="C#-N(=!31yk2k~p-q5rm"><field name="TEXT">123456</field></block></value></block></value><next><block type="text_print" id="04ryw(3R4*Y@|N0a?J@d"><value name="TEXT"><shadow type="text" id="T?}JM66qN^w|vvvfRg9K"><field name="TEXT">abc</field></shadow><block type="logic_compare" id="z%7O@*)k82ATw-f!aDrL"><field name="OP">EQ</field><value name="A"><block type="math_number" id="J]g$OOi{[+;__/HOh}I8"><field name="NUM">2</field></block></value><value name="B"><block type="math_number" id="{}?^m#CPfTgn~`pDuH,M"><field name="NUM">2</field></block></value></block></value><next><block type="text_print" id="vGpZtPo^gj@$2K0[)7),"><value name="TEXT"><shadow type="text" id="KSr!b-RycP:ghq![}uOl"><field name="TEXT">abc</field></shadow><block type="logic_operation" id="ht,F7a*n97:3mp2L`xAt"><field name="OP">AND</field><value name="A"><block type="logic_boolean" id="-p^6J9O5IzRZLtH|%lV_"><field name="BOOL">TRUE</field></block></value><value name="B"><block type="logic_boolean" id="IeAfGL}_-oVX;yWcC53n"><field name="BOOL">FALSE</field></block></value></block></value></block></next></block></next></block></next></block></next></block></next></block></next></block></statement></block><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="990"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment></block></xml>';
            break;    

        case 'programa_simples':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id=":5z$*!r1BaV%1WW2V3T+" x="10" y="270"><field name="NAME">botao1</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id=".z~.noqLg)?w(jhKjpY2"><value name="TEXT"><shadow type="text" id="Ksp!HO1L([XB59ytc$M("><field name="TEXT">abc</field></shadow><block type="text" id="Qy/vLv6NkHwvV-7AY~0="><field name="TEXT">FUNCIONA</field></block></value></block></statement></block><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="10" y="990"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment></block></xml>';
            break;  

        case 'inicializador':
            var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-110"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block></xml>';
            break;

        default:
            if( window.localStorage.getItem('currentBlocksXML') && (window.localStorage.getItem('currentBlocksXML').indexOf('xml') != -1) ) {
                var text = window.localStorage.getItem('currentBlocksXML');
            } else {
                var text = '<xml xmlns="http://www.w3.org/1999/xhtml"><variables></variables><block type="procedures_defnoreturn" id="F2HwVw7**7cWmq6=W]=x" x="30" y="-150"><field name="NAME">iniciar</field><comment pinned="false" h="80" w="160">Teste de função</comment><statement name="STACK"><block type="text_print" id="E.=!0,Vwym]rN*q{cvCP"><value name="TEXT"><shadow type="text" id="=`Sko;OW2A7jIFFuj^gO"><field name="TEXT">Inicio</field></shadow><block type="text" id="c)bDjQCM@fXCQj^Qy|Hv"><field name="TEXT">Inicio</field></block></value></block></statement></block></xml>';
            }
    }

    Code.workspacePlayground.clear();
    
    var xml = Blockly.Xml.textToDom(text);
    Blockly.Xml.domToWorkspace(xml, Code.workspacePlayground);

    setTimeout( function(){
        building = false;
        UpdateCode();

        document.getElementById('campo').value = texto1;
        window.localStorage.setItem('currentTexto1', texto1);
        document.getElementById('texto').value = texto2;
        window.localStorage.setItem('currentTexto2', texto2);
    }, 1000);
};

window.addEventListener('load', Code.init);