class ChessGame {
    constructor(boardId, statusId) {
        this.logic = new Chess();
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.sourceSquare = null;
        this.pendingMove = null;
        
        // Configurações de Tempo (10 minutos padrão)
        this.timers = { w: 600, b: 600 }; 
        this.timerInterval = null;

        const urlParams = new URLSearchParams(window.location.search);
        // Se houver "room" na URL, assume que é o convidado (Pretas)
        this.playerColor = urlParams.has('room') ? 'b' : 'w';

        this.promoter = new PawnPromotion(this, this.executePromotion.bind(this));
        this.network = new ChessNetwork(this);
        
        this.init();
    }
    
    init() {
        const settings = {
            draggable: false, 
            position: 'start',
            orientation: this.playerColor === 'b' ? 'black' : 'white',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        
        // Evento de clique nas casas
        $(document).on('click', '.square-55d63', (e) => {
            const square = $(e.currentTarget).data('square');
            this.handleSquareClick(square);
        });

        window.addEventListener('resize', () => this.board.resize());
        this.updateStatus();
        this.updateTimerDisplay();
    }

    // --- LÓGICA DE TEMPO ---
    startTimer() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        
        this.timerInterval = setInterval(() => {
            const turn = this.logic.turn(); // 'w' ou 'b'
            this.timers[turn]--;

            this.updateTimerDisplay();

            if (this.timers[turn] <= 0) {
                clearInterval(this.timerInterval);
                alert(`O tempo acabou! As ${turn === 'w' ? 'Pretas' : 'Brancas'} venceram.`);
                this.showMenu();
            }
        }, 1000);
    }

    updateTimerDisplay() {
        const format = (s) => {
            const min = Math.floor(s / 60);
            const sec = s % 60;
            return `${min}:${sec < 10 ? '0' : ''}${sec}`;
        };

        const turn = this.logic.turn();
        const userTime = this.playerColor === 'b' ? this.timers.b : this.timers.w;
        const oppTime = this.playerColor === 'b' ? this.timers.w : this.timers.b;

        document.getElementById('timerUser').innerText = format(userTime);
        document.getElementById('timerOpponent').innerText = format(oppTime);
        
        // Destaque visual do relógio ativo
        document.getElementById('timerUser').classList.toggle('active-timer', turn === this.playerColor);
        document.getElementById('timerOpponent').classList.toggle('active-timer', turn !== this.playerColor);
    }

    // --- LÓGICA DE JOGO ---
    handleSquareClick(square) {
        if (this.playerColor !== 'both' && this.logic.turn() !== this.playerColor) return;

        if (this.sourceSquare === null) {
            const piece = this.logic.get(square);
            if (piece && piece.color === this.logic.turn()) {
                this.sourceSquare = square;
                this.highlightSquare(square);
                this.showPossibleMoves(square);
            }
        } else {
            const from = this.sourceSquare;
            this.sourceSquare = null;
            this.removeHighlights();
            
            if (from !== square) this.handlePreMove(from, square);
        }
    }

    handlePreMove(source, target) {
        const fromPiece = this.logic.get(source);
        const isPromotion = fromPiece.type === 'p' && 
                           ((fromPiece.color === 'w' && target[1] === '8') ||
                            (fromPiece.color === 'b' && target[1] === '1'));

        if (isPromotion) {
            const moveTest = this.logic.move({ from: source, to: target, promotion: 'q' });
            if (moveTest) {
                this.logic.undo();
                this.pendingMove = { from: source, to: target };
                this.promoter.open();
            }
        } else {
            this.executeMove(source, target);
        }
    }

    executePromotion(pieceType) {
        if (this.pendingMove) {
            this.executeMove(this.pendingMove.from, this.pendingMove.to, pieceType);
            this.pendingMove = null;
        }
    }

    executeMove(source, target, promotion = 'q', shouldPublish = true) {
        const move = this.logic.move({ from: source, to: target, promotion: promotion });

        if (move) {
            if (shouldPublish && this.playerColor !== 'both') {
                this.network.sendMove({ from: source, to: target, promotion: promotion, color: this.playerColor });
            }
            this.board.position(this.logic.fen());
            this.updateStatus();
            this.updateTimerDisplay();
        }
    }

    // --- INTERFACE E MENU ---
    resign() {
        if (confirm("Tem certeza que deseja desistir da partida?")) {
            clearInterval(this.timerInterval);
            alert("Você desistiu. Fim de jogo.");
            this.showMenu();
        }
    }

    showMenu() {
        // Para os relógios e reseta o tabuleiro
        clearInterval(this.timerInterval);
        this.timers = { w: 600, b: 600 };
        this.logic.reset();
        this.board.start();
        this.updateTimerDisplay();
        
        // Troca os painéis
        document.querySelector('.mode-list').style.display = 'block';
        document.getElementById('gameControls').style.display = 'none';
        document.getElementById('multiplayerDetails').style.display = 'none';
    }

    highlightSquare(s) { $(`.square-${s}`).addClass('highlight-selected'); }
    
    removeHighlights() { $('.square-55d63').removeClass('highlight-selected highlight-hint'); }

    showPossibleMoves(square) {
        const moves = this.logic.moves({ square: square, verbose: true });
        moves.forEach(m => $(`.square-${m.to}`).addClass('highlight-hint'));
    }

    updateStatus() {
        const turn = this.logic.turn() === 'w' ? "Brancas" : "Pretas";
        let status = `Vez das ${turn}`;
        if (this.logic.in_checkmate()) status = `FIM: Xeque-Mate!`;
        else if (this.logic.in_draw()) status = "FIM: Empate.";
        this.statusEl.innerText = status;
    }
}

// Inicialização
const myGame = new ChessGame('boardContainer', 'status');

// --- EVENTOS DE BOTÃO ---

const startMatch = (mode) => {
    document.querySelector('.mode-list').style.display = 'none';
    document.getElementById('gameControls').style.display = 'flex';
    
    if (mode === 'local') {
        myGame.playerColor = 'both';
    } else {
        const urlParams = new URLSearchParams(window.location.search);
        myGame.playerColor = urlParams.has('room') ? 'b' : 'w';
        document.getElementById('multiplayerDetails').style.display = 'block';
        document.getElementById('shareUrl').value = window.location.href;
    }
    
    myGame.startTimer();
};

document.getElementById('btnLocal').addEventListener('click', () => startMatch('local'));
document.getElementById('btnOnline').addEventListener('click', () => startMatch('online'));

document.getElementById('btnResign').onclick = () => myGame.resign();

document.getElementById('btnNewGame').onclick = () => {
    if (confirm("Deseja encerrar esta partida e voltar ao menu?")) {
        myGame.showMenu();
    }
};

function copyLink() {
    const input = document.getElementById('shareUrl');
    input.select();
    navigator.clipboard.writeText(input.value);
    alert("Link copiado! Envie para seu amigo.");
}