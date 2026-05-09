'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trophy, Users } from 'lucide-react';

interface Player {
  id: string;
  name: string;
  score: number;
  isDrawer: boolean;
}

interface ScoreboardProps {
  players: Player[];
  currentDrawer?: Player;
  roundTimeRemaining: number;
}

export function Scoreboard({ players, currentDrawer, roundTimeRemaining }: ScoreboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score);
  const timeInSeconds = Math.ceil(roundTimeRemaining / 1000);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-indigo-200">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="w-5 h-5 text-yellow-500" />
            Current Game
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {currentDrawer && (
            <div className="text-sm">
              <p className="text-muted-foreground">Now Drawing:</p>
              <p className="font-semibold text-foreground">{currentDrawer.name}</p>
            </div>
          )}
          {roundTimeRemaining > 0 && (
            <div className="text-sm">
              <p className="text-muted-foreground">Time Remaining:</p>
              <p className="font-bold text-2xl text-indigo-600">{timeInSeconds}s</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Scores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {sortedPlayers.length === 0 ? (
              <p className="text-sm text-muted-foreground">No players yet</p>
            ) : (
              sortedPlayers.map((player, index) => (
                <div
                  key={player.id}
                  className={`flex items-center justify-between p-3 rounded-lg ${
                    player.isDrawer
                      ? 'bg-blue-100 border border-blue-300'
                      : 'bg-muted'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-muted-foreground w-6">
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-foreground">
                        {player.name}
                        {player.isDrawer && ' (Drawing)'}
                      </p>
                    </div>
                  </div>
                  <span className="font-bold text-lg text-foreground">{player.score}</span>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
