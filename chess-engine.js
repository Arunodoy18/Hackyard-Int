// A small, self-contained chess engine: rules, legal moves, and a simple machine opponent.
// No dependencies. Works in the browser (window.Chess) and in Node (module.exports).
(function (root) {
  "use strict";
  var WHITE = 0, BLACK = 8, P = 1, N = 2, B = 3, R = 4, Q = 5, K = 6;
  var TYPES = "pnbrqk";
  var START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
  var KN = [-33, -31, -18, -14, 14, 18, 31, 33];
  var KG = [-17, -16, -15, -1, 1, 15, 16, 17];
  var BD = [-17, -15, 15, 17];
  var RD = [-16, -1, 1, 16];
  var F_NORMAL = 0, F_DBL = 1, F_EP = 2, F_CK = 3, F_CQ = 4;
  var FILES = "abcdefgh";
  var sqName = function (s) { return FILES[s & 7] + (8 - (s >> 4)); };
  var nameSq = function (n) { return (8 - parseInt(n[1], 10)) * 16 + FILES.indexOf(n[0]); };
  var VAL = [0, 100, 320, 330, 500, 900, 0];

  function Chess(fen) { this.load(fen || START); }

  Chess.prototype.load = function (fen) {
    var f = fen.split(" ");
    this.b = new Int8Array(128);
    this.ks = [0, 0];
    var row = 0, col = 0, i, ch;
    for (i = 0; i < f[0].length; i++) {
      ch = f[0][i];
      if (ch === "/") { row++; col = 0; }
      else if (ch >= "1" && ch <= "8") col += +ch;
      else {
        var color = ch === ch.toUpperCase() ? WHITE : BLACK;
        var t = TYPES.indexOf(ch.toLowerCase()) + 1;
        var s = row * 16 + col;
        this.b[s] = color | t;
        if (t === K) this.ks[color ? 1 : 0] = s;
        col++;
      }
    }
    this.turn_ = f[1] === "b" ? BLACK : WHITE;
    this.cr = 0;
    var c = f[2] || "-";
    if (c.indexOf("K") >= 0) this.cr |= 1;
    if (c.indexOf("Q") >= 0) this.cr |= 2;
    if (c.indexOf("k") >= 0) this.cr |= 4;
    if (c.indexOf("q") >= 0) this.cr |= 8;
    this.ep = f[3] && f[3] !== "-" ? nameSq(f[3]) : -1;
    this.half = +(f[4] || 0);
    this.full = +(f[5] || 1);
    this.stack = [];
    this.hist = [];
    this.keys = [this.key()];
  };
  Chess.prototype.reset = function () { this.load(START); };
  Chess.prototype.turn = function () { return this.turn_ === WHITE ? "w" : "b"; };
  Chess.prototype.key = function () {
    var s = "", i;
    for (i = 0; i < 128; i++) { if (i & 0x88) { i += 7; continue; } s += this.b[i] ? this.b[i] : "."; }
    return s + this.turn_ + this.cr + this.ep;
  };

  // is square `sq` attacked by color `by`?
  Chess.prototype.att = function (sq, by) {
    var b = this.b, s, i, d, p;
    if (by === WHITE) {
      s = sq + 15; if (!(s & 0x88) && b[s] === (WHITE | P)) return true;
      s = sq + 17; if (!(s & 0x88) && b[s] === (WHITE | P)) return true;
    } else {
      s = sq - 15; if (!(s & 0x88) && b[s] === (BLACK | P)) return true;
      s = sq - 17; if (!(s & 0x88) && b[s] === (BLACK | P)) return true;
    }
    for (i = 0; i < 8; i++) { s = sq + KN[i]; if (!(s & 0x88) && b[s] === (by | N)) return true; }
    for (i = 0; i < 8; i++) { s = sq + KG[i]; if (!(s & 0x88) && b[s] === (by | K)) return true; }
    for (i = 0; i < 4; i++) {
      d = BD[i]; s = sq + d;
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === (by | B) || p === (by | Q)) return true; break; } s += d; }
      d = RD[i]; s = sq + d;
      while (!(s & 0x88)) { p = b[s]; if (p) { if (p === (by | R) || p === (by | Q)) return true; break; } s += d; }
    }
    return false;
  };

  // pseudo-legal moves for the side to move
  Chess.prototype.gen = function () {
    var b = this.b, us = this.turn_, them = us ^ 8, out = [], s, p, t, i, d, to, c, k, pr;
    var push = function (from, to, piece, cap, promo, flag) { out.push({ from: from, to: to, piece: piece, cap: cap, promo: promo, flag: flag }); };
    for (s = 0; s < 128; s++) {
      if (s & 0x88) { s += 7; continue; }
      p = b[s];
      if (!p || (p & 8) !== us) continue;
      t = p & 7;
      if (t === P) {
        var dir = us === WHITE ? -16 : 16, startRow = us === WHITE ? 6 : 1, promoRow = us === WHITE ? 1 : 6;
        to = s + dir;
        if (!(to & 0x88) && !b[to]) {
          if ((s >> 4) === promoRow) { for (k = 0; k < 4; k++) push(s, to, p, 0, [Q, R, B, N][k], F_NORMAL); }
          else { push(s, to, p, 0, 0, F_NORMAL); if ((s >> 4) === startRow && !b[to + dir]) push(s, to + dir, p, 0, 0, F_DBL); }
        }
        for (k = -1; k <= 1; k += 2) {
          to = s + dir + k;
          if (to & 0x88) continue;
          c = b[to];
          if (c && (c & 8) === them) {
            if ((s >> 4) === promoRow) { for (pr = 0; pr < 4; pr++) push(s, to, p, c, [Q, R, B, N][pr], F_NORMAL); }
            else push(s, to, p, c, 0, F_NORMAL);
          } else if (to === this.ep) push(s, to, p, them | P, 0, F_EP);
        }
      } else if (t === N || t === K) {
        var steps = t === N ? KN : KG;
        for (i = 0; i < 8; i++) {
          to = s + steps[i];
          if (to & 0x88) continue;
          c = b[to];
          if (!c) push(s, to, p, 0, 0, F_NORMAL);
          else if ((c & 8) === them) push(s, to, p, c, 0, F_NORMAL);
        }
        if (t === K) {
          if (us === WHITE && s === 116) {
            if ((this.cr & 1) && !b[117] && !b[118] && b[119] === (WHITE | R) && !this.att(116, BLACK) && !this.att(117, BLACK) && !this.att(118, BLACK)) push(116, 118, p, 0, 0, F_CK);
            if ((this.cr & 2) && !b[115] && !b[114] && !b[113] && b[112] === (WHITE | R) && !this.att(116, BLACK) && !this.att(115, BLACK) && !this.att(114, BLACK)) push(116, 114, p, 0, 0, F_CQ);
          } else if (us === BLACK && s === 4) {
            if ((this.cr & 4) && !b[5] && !b[6] && b[7] === (BLACK | R) && !this.att(4, WHITE) && !this.att(5, WHITE) && !this.att(6, WHITE)) push(4, 6, p, 0, 0, F_CK);
            if ((this.cr & 8) && !b[3] && !b[2] && !b[1] && b[0] === (BLACK | R) && !this.att(4, WHITE) && !this.att(3, WHITE) && !this.att(2, WHITE)) push(4, 2, p, 0, 0, F_CQ);
          }
        }
      } else {
        var dirs = t === B ? BD : t === R ? RD : BD.concat(RD);
        for (i = 0; i < dirs.length; i++) {
          d = dirs[i]; to = s + d;
          while (!(to & 0x88)) {
            c = b[to];
            if (!c) push(s, to, p, 0, 0, F_NORMAL);
            else { if ((c & 8) === them) push(s, to, p, c, 0, F_NORMAL); break; }
            to += d;
          }
        }
      }
    }
    return out;
  };

  Chess.prototype.make = function (m) {
    var b = this.b, us = this.turn_;
    this.stack.push({ m: m, cr: this.cr, ep: this.ep, half: this.half });
    b[m.to] = m.promo ? (us | m.promo) : m.piece;
    b[m.from] = 0;
    if (m.flag === F_EP) b[m.to + (us === WHITE ? 16 : -16)] = 0;
    else if (m.flag === F_CK) { b[m.to - 1] = b[m.to + 1]; b[m.to + 1] = 0; }
    else if (m.flag === F_CQ) { b[m.to + 1] = b[m.to - 2]; b[m.to - 2] = 0; }
    if ((m.piece & 7) === K) { this.ks[us ? 1 : 0] = m.to; this.cr &= us === WHITE ? ~3 : ~12; }
    var f = m.from, t = m.to;
    if (f === 112 || t === 112) this.cr &= ~2;
    if (f === 119 || t === 119) this.cr &= ~1;
    if (f === 0 || t === 0) this.cr &= ~8;
    if (f === 7 || t === 7) this.cr &= ~4;
    this.ep = m.flag === F_DBL ? (m.from + m.to) / 2 : -1;
    this.half = ((m.piece & 7) === P || m.cap) ? 0 : this.half + 1;
    if (us === BLACK) this.full++;
    this.turn_ = us ^ 8;
  };

  Chess.prototype.unmake = function () {
    var rec = this.stack.pop(), m = rec.m, b = this.b;
    this.turn_ ^= 8;
    var us = this.turn_;
    b[m.from] = m.piece;
    b[m.to] = (m.cap && m.flag !== F_EP) ? m.cap : 0;
    if (m.flag === F_EP) b[m.to + (us === WHITE ? 16 : -16)] = m.cap;
    else if (m.flag === F_CK) { b[m.to + 1] = b[m.to - 1]; b[m.to - 1] = 0; }
    else if (m.flag === F_CQ) { b[m.to - 2] = b[m.to + 1]; b[m.to + 1] = 0; }
    if ((m.piece & 7) === K) this.ks[us ? 1 : 0] = m.from;
    this.cr = rec.cr; this.ep = rec.ep; this.half = rec.half;
    if (us === BLACK) this.full--;
  };

  // legal moves (internal move objects)
  Chess.prototype.legal = function () {
    var ps = this.gen(), out = [], us = this.turn_, i;
    for (i = 0; i < ps.length; i++) {
      this.make(ps[i]);
      if (!this.att(this.ks[us ? 1 : 0], us ^ 8)) out.push(ps[i]);
      this.unmake();
    }
    return out;
  };

  Chess.prototype.in_check = function () { return this.att(this.ks[this.turn_ ? 1 : 0], this.turn_ ^ 8); };
  Chess.prototype.in_checkmate = function () { return this.in_check() && this.legal().length === 0; };
  Chess.prototype.in_stalemate = function () { return !this.in_check() && this.legal().length === 0; };
  Chess.prototype.insufficient = function () {
    var minors = 0, i, p, t;
    for (i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      p = this.b[i]; if (!p) continue; t = p & 7;
      if (t === P || t === R || t === Q) return false;
      if (t === N || t === B) minors++;
    }
    return minors <= 1;
  };
  Chess.prototype.in_draw = function () {
    if (this.half >= 100 || this.insufficient()) return true;
    var k = this.keys[this.keys.length - 1], n = 0, i;
    for (i = 0; i < this.keys.length; i++) if (this.keys[i] === k) n++;
    return n >= 3 || this.in_stalemate();
  };
  Chess.prototype.game_over = function () { return this.legal().length === 0 || this.in_draw(); };
  Chess.prototype.history = function () { return this.hist.slice(); };
  Chess.prototype.get = function (name) {
    var p = this.b[nameSq(name)];
    return p ? { type: TYPES[(p & 7) - 1], color: (p & 8) ? "b" : "w" } : null;
  };
  Chess.prototype.kingSquare = function (color) { return sqName(this.ks[color === "b" ? 1 : 0]); };

  Chess.prototype.san = function (m, legal) {
    var t = m.piece & 7, s;
    if (m.flag === F_CK) s = "O-O";
    else if (m.flag === F_CQ) s = "O-O-O";
    else {
      var to = sqName(m.to), from = sqName(m.from);
      if (t === P) s = (m.cap ? from[0] + "x" : "") + to + (m.promo ? "=" + "  NBRQ"[m.promo].trim() : "");
      else {
        var same = legal.filter(function (o) { return o.piece === m.piece && o.to === m.to && o.from !== m.from; }), dis = "";
        if (same.length) {
          var sameFile = same.some(function (o) { return (o.from & 7) === (m.from & 7); });
          var sameRank = same.some(function (o) { return (o.from >> 4) === (m.from >> 4); });
          if (!sameFile) dis = from[0]; else if (!sameRank) dis = from[1]; else dis = from;
        }
        s = "  NBRQK"[t].trim() + dis + (m.cap ? "x" : "") + to;
      }
    }
    return s;
  };

  Chess.prototype.toVerbose = function (m, legal) {
    return {
      from: sqName(m.from), to: sqName(m.to), piece: TYPES[(m.piece & 7) - 1],
      captured: m.cap ? TYPES[(m.cap & 7) - 1] : undefined,
      promotion: m.promo ? TYPES[m.promo - 1] : undefined,
      san: this.san(m, legal), flag: m.flag
    };
  };

  // legal moves for the UI: [{from,to,piece,captured,promotion,san}]
  Chess.prototype.moves = function (opts) {
    var legal = this.legal(), self = this, sq = opts && opts.square ? nameSq(opts.square) : null;
    return legal.filter(function (m) { return sq === null || m.from === sq; }).map(function (m) { return self.toVerbose(m, legal); });
  };

  Chess.prototype.move = function (o) {
    var legal = this.legal(), from = nameSq(o.from), to = nameSq(o.to), i, m = null;
    var want = o.promotion ? TYPES.indexOf(o.promotion) + 1 : Q;
    for (i = 0; i < legal.length; i++) {
      if (legal[i].from === from && legal[i].to === to && (!legal[i].promo || legal[i].promo === want)) { m = legal[i]; break; }
    }
    if (!m) return null;
    var v = this.toVerbose(m, legal);
    this.make(m);
    var rep = this.in_check();
    var any = rep ? this.legal().length > 0 : true;
    v.san += rep ? (any ? "+" : "#") : "";
    this.hist.push(v.san);
    this.keys.push(this.key());
    return v;
  };

  Chess.prototype.undo = function () {
    if (!this.stack.length) return null;
    this.unmake(); this.hist.pop(); this.keys.pop();
    return true;
  };

  Chess.prototype.perft = function (depth) {
    if (depth === 0) return 1;
    var ms = this.legal(), n = 0, i;
    if (depth === 1) return ms.length;
    for (i = 0; i < ms.length; i++) { this.make(ms[i]); n += this.perft(depth - 1); this.unmake(); }
    return n;
  };

  // ---------------- the machine ----------------
  Chess.prototype.evaluate = function () {
    // score from the point of view of the side to move
    var b = this.b, s = 0, i, p, t, x, y, cen, v, adv;
    for (i = 0; i < 128; i++) {
      if (i & 0x88) { i += 7; continue; }
      p = b[i]; if (!p) continue;
      t = p & 7; x = i & 7; y = i >> 4;
      cen = 3.5 - Math.max(Math.abs(x - 3.5), Math.abs(y - 3.5));
      v = VAL[t];
      if (t === P) { adv = (p & 8) ? y - 1 : 6 - y; v += adv * 8 + (x === 3 || x === 4 ? adv * 4 : 0); }
      else if (t === N || t === B) v += cen * 10;
      else if (t === Q) v += cen * 2;
      else if (t === K) v += ((p & 8) ? (y === 0 ? 12 : 0) : (y === 7 ? 12 : 0));
      s += (p & 8) ? -v : v;
    }
    return this.turn_ === WHITE ? s : -s;
  };

  Chess.prototype.order = function (ms) {
    ms.sort(function (a, b) {
      var sa = (a.cap ? 10 * VAL[a.cap & 7] - VAL[a.piece & 7] : 0) + (a.promo ? 800 : 0);
      var sb = (b.cap ? 10 * VAL[b.cap & 7] - VAL[b.piece & 7] : 0) + (b.promo ? 800 : 0);
      return sb - sa;
    });
    return ms;
  };

  Chess.prototype.qsearch = function (alpha, beta, ctx, depth) {
    if (++ctx.nodes % 2048 === 0 && Date.now() > ctx.deadline) ctx.stop = true;
    if (ctx.stop) return 0;
    var stand = this.evaluate();
    if (depth <= 0 || stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    var ms = this.order(this.gen().filter(function (m) { return m.cap; })), us = this.turn_, i, sc;
    for (i = 0; i < ms.length; i++) {
      this.make(ms[i]);
      if (this.att(this.ks[us ? 1 : 0], us ^ 8)) { this.unmake(); continue; }
      sc = -this.qsearch(-beta, -alpha, ctx, depth - 1);
      this.unmake();
      if (ctx.stop) return 0;
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    return alpha;
  };

  Chess.prototype.search = function (depth, alpha, beta, ctx, ply) {
    if (++ctx.nodes % 2048 === 0 && Date.now() > ctx.deadline) ctx.stop = true;
    if (ctx.stop) return 0;
    if (depth <= 0) return this.qsearch(alpha, beta, ctx, 4);
    var ms = this.order(this.gen()), us = this.turn_, legal = 0, i, sc;
    for (i = 0; i < ms.length; i++) {
      this.make(ms[i]);
      if (this.att(this.ks[us ? 1 : 0], us ^ 8)) { this.unmake(); continue; }
      legal++;
      sc = -this.search(depth - 1, -beta, -alpha, ctx, ply + 1);
      this.unmake();
      if (ctx.stop) return 0;
      if (sc >= beta) return sc;
      if (sc > alpha) alpha = sc;
    }
    if (!legal) return this.in_check() ? -100000 + ply : 0;
    return alpha;
  };

  // pick a move for the side to move, thinking for at most `ms` milliseconds
  Chess.prototype.bestMove = function (ms, maxDepth) {
    var legal = this.legal();
    if (!legal.length) return null;
    var ctx = { nodes: 0, stop: false, deadline: Date.now() + (ms || 800) };
    var best = legal[0], scores = null, depth, i, sc, cur, us = this.turn_;
    this.order(legal);
    for (depth = 1; depth <= (maxDepth || 4); depth++) {
      cur = [];
      var alpha = -1e9, bestHere = null;
      for (i = 0; i < legal.length; i++) {
        this.make(legal[i]);
        sc = -this.search(depth - 1, -1e9, -(alpha - 6), ctx, 1);
        this.unmake();
        if (ctx.stop) break;
        cur.push({ m: legal[i], s: sc });
        if (sc > alpha) { alpha = sc; bestHere = legal[i]; }
      }
      if (ctx.stop) break;
      scores = cur; best = bestHere || best;
      cur.sort(function (a, b) { return b.s - a.s; });
      legal = cur.map(function (x) { return x.m; });
      if (alpha > 90000) break;
    }
    if (scores) {
      var top = scores[0].s, pool = scores.filter(function (x) { return x.s > top - 6; });
      best = pool[Math.floor(Math.random() * pool.length)].m;
    }
    return this.toVerbose(best, this.legal());
  };

  if (typeof module !== "undefined" && module.exports) module.exports = { Chess: Chess };
  else root.Chess = Chess;
})(typeof window !== "undefined" ? window : this);
