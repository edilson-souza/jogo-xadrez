class ChessGame {
    constructor(boardId, statusId) {
        this.logic = new Chess();
        this.boardId = boardId;
        this.statusEl = document.getElementById(statusId);
        this.sourceSquare = null;
        this.pendingMove = null;

        // Determina cor: se entrou por link de sala, é Pretas (b), senão é Brancas (w)
        const urlParams = new URLSearchParams(window.location.search);
        this.playerColor = urlParams.has('room') && document.referrer ? 'b' : 'w';

        this.promoter = new PawnPromotion(this, this.executePromotion.bind(this));
        this.network = new ChessNetwork(this);
        
        this.init();
    }
    
    init() {
        const settings = {
            draggable: false,
            position: 'start',
            orientation: this.playerColor === 'w' ? 'white' : 'black',
            pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
        };

        this.board = Chessboard(this.boardId, settings);
        
        $(`#${this.boardId}`).on('click', '.square-55d63', (e) => {
            const square = $(e.currentTarget).data('square');
            this.handleSquareClick(square);
        });

        window.addEventListener('resize', () => this.board.resize());
        this.updateStatus();
    }

    handleSquareClick(square) {
        // Trava de Turno Online: Só move se for a vez da sua cor
        if (this.logic.turn() !== this.playerColor) return;

        if (this.sourceSquare === null) {
            const piece = this.logic.get(square);
            if (piece && piece.color === this.logic.turn()) {
                this.sourceSquare = square;
                this.highlightSquare(square);
                this.showPossibleMoves(square);
            }
        } else {
            const source = this.sourceSquare;
            this.removeHighlights();
            this.sourceSquare = null;

            if (source !== square) this.handlePreMove(source, square);
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

    executeMove(source, target, promotionType = 'q', shouldPublish = true) {
        const move = this.logic.move({ from: source, to: target, promotion: promotionType });

        if (move) {
            if (shouldPublish) {
                this.network.sendMove({ from: source, to: target, promotion: promotionType, color: this.playerColor });
            }
            this.board.position(this.logic.fen());
            this.updateStatus();
        }
    }

    showPossibleMoves(square) {
        const moves = this.logic.moves({ square: square, verbose: true });
        moves.forEach(m => $(`#${this.boardId} .square-${m.to}`).addClass('highlight-hint'));
    }

    highlightSquare(s) { $(`#${this.boardId} .square-${s}`).addClass('highlight-selected'); }
    
    removeHighlights() { $(`#${this.boardId} .square-55d63`).removeClass('highlight-selected highlight-hint'); }

    updateStatus() {
        const turn = this.logic.turn() === 'w' ? "Brancas" : "Pretas";
        let status = `Vez das ${turn}`;
        if (this.logic.in_checkmate()) status = `FIM: Xeque-Mate (${turn} perdeu).`;
        else if (this.logic.in_draw()) status = "FIM: Empate.";
        
        this.statusEl.innerText = status;
    }
}

const myGame = new ChessGame('boardContainer', 'status');