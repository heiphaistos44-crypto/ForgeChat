import { useState } from 'react'
import { Search } from 'lucide-react'

const CATEGORIES = [
  {
    label: '😀 Smileys',
    emojis: ['😀','😃','😄','😁','😆','😅','🤣','😂','🙂','🙃','😉','😊','😇','🥰','😍','🤩','😘','😗','😚','😙','😋','😛','😜','🤪','😝','🤑','🤗','🤭','🤫','🤔','🤐','🤨','😐','😑','😶','😏','😒','🙄','😬','🤥','😌','😔','😪','🤤','😴','😷','🤒','🤕','🤢','🤮','🤧','🥵','🥶','😵','🤯','🤠','🥳','😎','🤓','😕','😟','🙁','☹️','😮','😯','😲','😳','🥺','😦','😧','😨','😰','😥','😢','😭','😱','😖','😣','😞','😓','😩','😫','🥱','😤','😡','😠','🤬','😈','👿','💀','☠️','💩','🤡','👻','👽','🤖'],
  },
  {
    label: '👋 Gestes',
    emojis: ['👋','🤚','✋','🖖','👌','🤌','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','👍','👎','✊','👊','🤛','🤜','👏','🙌','👐','🙏','💪','👀','👂','👃','👅','👄'],
  },
  {
    label: '❤️ Cœurs',
    emojis: ['❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💖','💘','💝','💟','🔥','✨','⭐','🌟','💫','🎉','🎊','🎈','🎁','🏆','🥇'],
  },
  {
    label: '🐶 Animaux',
    emojis: ['🐶','🐱','🐭','🐹','🐰','🦊','🐻','🐼','🐨','🐯','🦁','🐮','🐷','🐸','🐵','🐔','🐧','🐦','🐤','🦆','🦅','🦉','🦇','🐺','🐗','🐴','🦄','🐝','🐛','🦋','🐌','🐞','🐜','🦟','🦗','🕷️','🦂','🐢','🦎','🐍','🐊','🦕','🦖','🐙','🦑','🦐','🦞','🦀','🐡','🐟','🐠','🐬','🐳','🐋','🦈','🐊','🐅','🐆','🦓','🦍','🦧','🦣','🐘','🦛','🦏','🐪','🐫','🦒','🦘','🦬','🐃','🐂','🐄','🐎','🐖','🐏','🐑','🦙','🐐','🦌','🐕','🐩','🦮','🐕‍🦺','🐈','🐈‍⬛'],
  },
  {
    label: '🍎 Nourriture',
    emojis: ['🍏','🍎','🍊','🍋','🍌','🍉','🍇','🍓','🍈','🍑','🥭','🍍','🥥','🥝','🍅','🍆','🥑','🥦','🥕','🌽','🍄','🧄','🧅','🥔','🍞','🥐','🍕','🍔','🍟','🌭','🍿','🧂','🥚','🍳','🥞','🧇','🥓','🥩','🍗','🍖','🌮','🌯','🍱','🍣','🍜','🍝','🍛','🥗','🍲','🍛','🍙','🍚','🍘','🍥','🧁','🍰','🎂','🍭','🍫','🍩','🍪','☕','🍵','🧃','🥤','🧋','🍺','🍻','🥂','🍷','🥃','🍹'],
  },
  {
    label: '⚽ Sports',
    emojis: ['⚽','🏀','🏈','⚾','🥎','🎾','🏐','🏉','🎱','🏓','🏸','🥊','🥋','⛳','🎣','🤿','🏋️','🤼','🤸','🏊','🚴','🏆','🥇','🥈','🥉','🏅','🎖️','🎯','🎳','🎮','🎰','🧩','🎲','♟️','🎭','🎨','🎬','🎤','🎧','🎸','🎹','🥁','🎺','🎷','🎻'],
  },
  {
    label: '🌍 Nature',
    emojis: ['🌸','🌺','🌻','🌹','🌷','🌼','🌱','🌿','🍀','🍁','🍂','🍃','🌾','🌲','🌳','🌴','🌵','🎋','🍄','🌊','🌀','🌈','❄️','☃️','⛄','🌤️','⛅','☁️','🌧️','⛈️','🌩️','🌨️','💨','💧','💦','⚡','🔥','🌙','⭐','🌟','☀️','🌤️','🌍','🌎','🌏','🌋','⛰️','🏔️','🏕️','🏖️','🏜️','🏝️','🌃','🌆','🌇','🌉'],
  },
  {
    label: '🚗 Objets',
    emojis: ['🚗','🚕','🚙','🚌','🚎','🏎️','🚓','🚑','🚒','✈️','🚀','🛸','🚁','🛶','⛵','🚢','🛥️','🚤','🛳️','⛴️','🚂','🚃','🚄','🚅','🚆','🚇','🚊','🚉','🛺','🚲','🛴','🛵','🏍️','💺','🛸','⌚','📱','💻','🖥️','🖨️','⌨️','🖱️','📷','📸','📹','🎥','📽️','📺','📻','🎙️','📡','🔋','💡','🔦','🕯️','💰','💳','💎','⚗️','🔭','🔬','🧲','🔑','🗝️','🔒','🔓','🔨','🪓','⛏️','🔧','🔩','🪛','🧰','🗡️','⚔️','🛡️','🎁','🎀','🎊','🎉','🎈','🎂','🎗️','🏮','🧧','✉️','📬','📮','📦','📫','📚','📖','📝','✏️','🖊️','🖋️','📌','📍','📎','🖇️','✂️','🗃️','🗂️','🗄️','🗑️','🔐','🔏'],
  },
]

interface Props {
  onPick: (emoji: string) => void
  onClose: () => void
}

export default function EmojiPicker({ onPick, onClose }: Props) {
  const [search, setSearch] = useState('')
  const [activeCategory, setActiveCategory] = useState(0)

  const filtered = search.trim()
    ? CATEGORIES.flatMap(c => c.emojis).filter(e => {
        const q = search.toLowerCase()
        return e.includes(q) || q.length === 0
      })
    : null

  const displayed = filtered ?? CATEGORIES[activeCategory].emojis

  return (
    <div
      className="absolute bottom-full right-0 mb-2 bg-fc-channel border border-fc-hover rounded-xl shadow-2xl w-80 z-50 overflow-hidden"
      onClick={e => e.stopPropagation()}
    >
      {/* Barre de recherche */}
      <div className="p-2 border-b border-fc-hover">
        <div className="flex items-center gap-2 bg-fc-input rounded-lg px-2 py-1.5">
          <Search size={14} className="text-fc-muted flex-shrink-0" />
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher un emoji..."
            className="bg-transparent text-sm text-white outline-none flex-1 placeholder-fc-muted"
          />
        </div>
      </div>

      {/* Onglets catégories */}
      {!filtered && (
        <div className="flex overflow-x-auto no-scrollbar border-b border-fc-hover px-1">
          {CATEGORIES.map((cat, i) => (
            <button
              key={i}
              onClick={() => setActiveCategory(i)}
              title={cat.label.split(' ').slice(1).join(' ')}
              className={`flex-shrink-0 px-2 py-1.5 text-base hover:bg-fc-hover/50 rounded transition
                ${activeCategory === i ? 'border-b-2 border-fc-accent' : ''}`}
            >
              {cat.emojis[0]}
            </button>
          ))}
        </div>
      )}

      {/* Grille emojis */}
      <div className="h-52 overflow-y-auto p-2">
        {!filtered && (
          <div className="text-xs font-semibold text-fc-muted uppercase tracking-wide mb-2 px-1">
            {CATEGORIES[activeCategory].label.split(' ').slice(1).join(' ')}
          </div>
        )}
        <div className="grid grid-cols-9 gap-0.5">
          {displayed.map((emoji, i) => (
            <button
              key={i}
              onClick={() => { onPick(emoji); onClose() }}
              className="w-8 h-8 flex items-center justify-center text-xl rounded hover:bg-fc-hover transition hover:scale-110"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
          {displayed.length === 0 && (
            <div className="col-span-9 text-center text-fc-muted text-sm py-6">Aucun résultat</div>
          )}
        </div>
      </div>
    </div>
  )
}
